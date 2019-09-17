package views

import (
	"context"
	"fmt"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/micro/go-micro/client"
	"github.com/nicksnyder/go-i18n/i18n"
	"github.com/pborman/uuid"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/tree"
	context2 "github.com/pydio/cells/common/utils/context"
)

// CopyMoveNodes performs a recursive copy or move operation of a node to a new location. It can be inter- or intra-datasources.
// It will eventually pass contextual metadata like X-Pydio-Session (to batch event inside the SYNC) or X-Pydio-Move (to
// reconciliate creates and deletes when move is done between two differing datasources).
func CopyMoveNodes(ctx context.Context, router Handler, sourceNode *tree.Node, targetNode *tree.Node, move bool, recursive bool, isTask bool, statusChan chan string, progressChan chan float32, tFunc ...i18n.TranslateFunc) (oErr error) {

	session := uuid.New()
	defer func() {
		// Make sure all sessions are purged !
		if p := recover(); p != nil {
			log.Logger(ctx).Error("Error during copy/move", zap.Error(p.(error)))
			oErr = p.(error)
			go func() {
				<-time.After(10 * time.Second)
				log.Logger(ctx).Debug("Force close session now:" + session)
				client.Publish(ctx, client.NewPublication(common.TOPIC_INDEX_EVENT, &tree.IndexEvent{
					SessionForceClose: session,
				}))
			}()
		}
	}()
	publishError := func(dsName, errorPath string) {
		client.Publish(ctx, client.NewPublication(common.TOPIC_INDEX_EVENT, &tree.IndexEvent{
			ErrorDetected:  true,
			DataSourceName: dsName,
			ErrorPath:      errorPath,
		}))
	}
	childrenMoved := 0
	logger := log.Logger(ctx)
	var taskLogger *zap.Logger
	if isTask {
		taskLogger = log.TasksLogger(ctx)
	} else {
		taskLogger = zap.New(zapcore.NewNopCore())
	}
	// Read root of target to detect if it is on the same datasource as sourceNode
	var crossDs bool
	var sourceDs, targetDs string
	sourceDs = sourceNode.GetStringMeta(common.META_NAMESPACE_DATASOURCE_NAME)
	if move {
		if tDs := targetNode.GetStringMeta(common.META_NAMESPACE_DATASOURCE_NAME); tDs != "" {
			targetDs = tDs
			crossDs = targetDs != sourceDs
		} else {
			parts := strings.Split(strings.Trim(targetNode.Path, "/"), "/")
			if len(parts) > 0 {
				if testRoot, e := router.ReadNode(ctx, &tree.ReadNodeRequest{Node: &tree.Node{Path: parts[0]}}); e == nil {
					targetDs = testRoot.Node.GetStringMeta(common.META_NAMESPACE_DATASOURCE_NAME)
					crossDs = targetDs != sourceDs
				}
			}
		}
	}

	if recursive && !sourceNode.IsLeaf() {

		prefixPathSrc := strings.TrimRight(sourceNode.Path, "/")
		prefixPathTarget := strings.TrimRight(targetNode.Path, "/")
		targetDsPath := targetNode.GetStringMeta(common.META_NAMESPACE_DATASOURCE_PATH)

		// List all children and move them all
		streamer, err := router.ListNodes(ctx, &tree.ListNodesRequest{
			Node:      sourceNode,
			Recursive: true,
		})
		if err != nil {
			logger.Error("Copy/move - List Nodes", zap.Error(err))
			return err
		}
		var children []*tree.Node
		defer streamer.Close()
		var statErrors int

		for {
			child, cE := streamer.Recv()
			if cE != nil {
				break
			}
			if child == nil {
				continue
			}
			if child.Node.IsLeaf() {
				if _, statErr := router.ReadNode(ctx, &tree.ReadNodeRequest{Node: child.Node, ObjectStats: true}); statErr != nil {
					statErrors++
				}
			}
			children = append(children, child.Node)
		}
		if statErrors > 0 {
			// There are some missing childrens, this copy/move operation will fail - interrupt now
			publishError(sourceDs, sourceNode.Path)
			return fmt.Errorf("Errors found while copy/move node, stopping")
		}

		if len(children) > 0 {
			cMess := fmt.Sprintf("There are %v children to move", len(children))
			logger.Info(cMess)
			taskLogger.Info(cMess)
		}
		total := len(children)

		// For Copy case, first create new folders with fresh UUID
		if !move {
			for _, childNode := range children {
				if childNode.IsLeaf() {
					continue
				}

				childPath := childNode.Path
				relativePath := strings.TrimPrefix(childPath, prefixPathSrc+"/")
				targetPath := prefixPathTarget + "/" + relativePath
				status := "Copying " + relativePath
				if len(tFunc) > 0 {
					status = strings.Replace(tFunc[0]("Jobs.User.CopyingItem"), "%s", relativePath, -1)
				}
				statusChan <- status

				folderNode := childNode.Clone()
				folderNode.Path = targetPath
				folderNode.Uuid = uuid.New()
				if targetDsPath != "" {
					folderNode.SetMeta(common.META_NAMESPACE_DATASOURCE_PATH, path.Join(targetDsPath, relativePath))
				}
				_, e := router.CreateNode(ctx, &tree.CreateNodeRequest{Node: folderNode, IndexationSession: session, UpdateIfExists: true})
				if e != nil {
					logger.Error("-- Create Folder ERROR", zap.Error(e), zap.Any("from", childNode.Path), zap.Any("to", targetPath))
					publishError(targetDs, folderNode.Path)
					panic(e)
				}
				logger.Debug("-- Copy Folder Success ", zap.String("to", targetPath), childNode.Zap())
				taskLogger.Info("-- Copied Folder To " + targetPath)
			}
		}

		wg := &sync.WaitGroup{}
		queue := make(chan struct{}, 4)
		var translate i18n.TranslateFunc
		if len(tFunc) > 0 {
			translate = tFunc[0]
		}

		t := time.Now()
		var lastNode *tree.Node
		var errors []error
		for idx, childNode := range children {

			if idx == len(children)-1 {
				lastNode = childNode
				continue
			}
			// copy for inner function
			childNode := childNode

			wg.Add(1)
			queue <- struct{}{}
			go func() {
				defer func() {
					<-queue
					defer wg.Done()
				}()
				e := processCopyMove(ctx, router, session, move, crossDs, sourceDs, targetDs, false, childNode, prefixPathSrc, prefixPathTarget, targetDsPath, logger, publishError, statusChan, translate)
				if e != nil {
					errors = append(errors, e)
				} else {
					childrenMoved++
					progressChan <- float32(childrenMoved) / float32(total)
					taskLogger.Info("-- Copy/Move Success for " + childNode.Path)
				}
			}()

		}
		wg.Wait()
		if len(errors) > 0 {
			panic(errors[0])
		}
		if lastNode != nil {
			// Now process very last node
			e := processCopyMove(ctx, router, session, move, crossDs, sourceDs, targetDs, true, lastNode, prefixPathSrc, prefixPathTarget, targetDsPath, logger, publishError, statusChan, translate)
			if e != nil {
				panic(e)
			}
			childrenMoved++
			progressChan <- float32(childrenMoved) / float32(total)

			taskLogger.Info("-- Copy/Move Success for " + lastNode.Path)
		}
		log.Logger(ctx).Info("Recursive copy operation timing", zap.Duration("duration", time.Now().Sub(t)))

	}

	if childrenMoved > 0 {
		log.Logger(ctx).Info(fmt.Sprintf("Successfully copied or moved %v, now moving parent node", childrenMoved))
	}

	// Now Copy/Move initial node
	if sourceNode.IsLeaf() {

		// Prepare Meta for Copy/Delete operations. If Move accross DS or Copy, we send directly the close- session
		// as this will be a one shot operation on each datasource.
		copyMeta := make(map[string]string)
		deleteMeta := make(map[string]string)
		closeSession := common.SyncSessionClose_ + session
		if move {
			copyMeta[common.X_AMZ_META_DIRECTIVE] = "COPY"
			deleteMeta[common.XPydioSessionUuid] = closeSession
			if crossDs {
				copyMeta[common.XPydioSessionUuid] = closeSession
				// Identify copy/delete across 2 datasources
				copyMeta[common.XPydioMoveUuid] = sourceNode.Uuid
				deleteMeta[common.XPydioMoveUuid] = sourceNode.Uuid
			} else {
				copyMeta[common.XPydioSessionUuid] = session
			}
		} else {
			copyMeta[common.X_AMZ_META_DIRECTIVE] = "REPLACE"
			copyMeta[common.XPydioSessionUuid] = closeSession
		}

		_, e := router.CopyObject(ctx, sourceNode, targetNode, &CopyRequestData{Metadata: copyMeta})
		if e != nil {
			publishError(sourceDs, sourceNode.Path)
			publishError(targetDs, targetNode.Path)
			panic(e)
		}
		// Remove Source Node
		if move {
			ctx = context2.WithAdditionalMetadata(ctx, deleteMeta)
			_, moveErr := router.DeleteNode(ctx, &tree.DeleteNodeRequest{Node: sourceNode})
			if moveErr != nil {
				logger.Error("-- Delete Source Error / Reverting Copy", zap.Error(moveErr), sourceNode.Zap())
				router.DeleteNode(ctx, &tree.DeleteNodeRequest{Node: targetNode})
				publishError(sourceDs, sourceNode.Path)
				panic(moveErr)
			}
		}

	} else if !move {
		session = common.SyncSessionClose_ + session
		logger.Debug("-- Copying sourceNode with empty Uuid - Close Session")
		targetNode.Type = tree.NodeType_COLLECTION
		_, e := router.CreateNode(ctx, &tree.CreateNodeRequest{Node: targetNode, IndexationSession: session, UpdateIfExists: true})
		if e != nil {
			panic(e)
		}
		taskLogger.Info("-- Copied sourceNode with empty Uuid - Close Session")
	}

	if move {
		// Send an optimistic event => s3 operations are done, let's update UX before indexation is finished
		optimisticTarget := sourceNode.Clone()
		optimisticTarget.Path = targetNode.Path
		optimisticTarget.SetMeta("name", path.Base(targetNode.Path))
		log.Logger(ctx).Debug("Finished move - Sending Optimistic Event", sourceNode.Zap("from"), optimisticTarget.Zap("to"))
		client.Publish(ctx, client.NewPublication(common.TOPIC_TREE_CHANGES, &tree.NodeChangeEvent{
			Optimistic: true,
			Type:       tree.NodeChangeEvent_UPDATE_PATH,
			Source:     sourceNode,
			Target:     optimisticTarget,
		}))
	}

	return
}

func processCopyMove(ctx context.Context, handler Handler, session string, move bool, crossDs bool, sourceDs, targetDs string, closeSession bool, childNode *tree.Node, prefixPathSrc, prefixPathTarget, targetDsPath string, logger *zap.Logger, publishError func(string, string), statusChan chan string, tFunc i18n.TranslateFunc) error {

	childPath := childNode.Path
	relativePath := strings.TrimPrefix(childPath, prefixPathSrc+"/")
	targetPath := prefixPathTarget + "/" + relativePath
	targetNode := &tree.Node{Path: targetPath}
	if targetDsPath != "" {
		targetNode.SetMeta(common.META_NAMESPACE_DATASOURCE_PATH, path.Join(targetDsPath, relativePath))
	}
	var justCopied *tree.Node
	justCopied = nil
	// Copy files - For "Copy" operation, do NOT copy .pydio files
	if childNode.IsLeaf() && (move || path.Base(childPath) != common.PYDIO_SYNC_HIDDEN_FILE_META) {

		logger.Debug("Copy " + childNode.Path + " to " + targetPath)
		var statusPath = relativePath
		if path.Base(statusPath) == common.PYDIO_SYNC_HIDDEN_FILE_META {
			statusPath = path.Dir(statusPath)
		}
		status := "Copying " + statusPath
		if tFunc != nil {
			status = strings.Replace(tFunc("Jobs.User.CopyingItem"), "%s", statusPath, -1)
		}
		statusChan <- status

		meta := make(map[string]string, 1)
		if move {
			meta[common.X_AMZ_META_DIRECTIVE] = "COPY"
		} else {
			meta[common.X_AMZ_META_DIRECTIVE] = "REPLACE"
		}
		meta[common.XPydioSessionUuid] = session
		if crossDs {
			/*
				if idx == len(children)-1 {
					meta[common.XPydioSessionUuid] = "close-" + session
				}
			*/
			if closeSession {
				meta[common.XPydioSessionUuid] = common.SyncSessionClose_ + session
			}
			if move {
				meta[common.XPydioMoveUuid] = childNode.Uuid
			}
		}
		_, e := handler.CopyObject(ctx, childNode, targetNode, &CopyRequestData{Metadata: meta})
		if e != nil {
			logger.Error("-- Copy ERROR", zap.Error(e), zap.Any("from", childNode.Path), zap.Any("to", targetPath))
			publishError(sourceDs, childNode.Path)
			publishError(targetDs, targetPath)
			return e
		}
		justCopied = targetNode
		logger.Debug("-- Copy Success: ", zap.String("to", targetPath), childNode.Zap())

	}

	// Remove original for move case
	if move {
		// If we're sending the last Delete here - then we close the session at the same time
		if closeSession {
			session = common.SyncSessionClose_ + session
		}
		delCtx := ctx
		if crossDs {
			delCtx = context2.WithAdditionalMetadata(ctx, map[string]string{common.XPydioMoveUuid: childNode.Uuid})
		}
		_, moveErr := handler.DeleteNode(delCtx, &tree.DeleteNodeRequest{Node: childNode, IndexationSession: session})
		if moveErr != nil {
			log.Logger(ctx).Error("-- Delete Error / Reverting Copy", zap.Error(moveErr), childNode.Zap())
			if justCopied != nil {
				if _, revertErr := handler.DeleteNode(delCtx, &tree.DeleteNodeRequest{Node: justCopied}); revertErr != nil {
					log.Logger(ctx).Error("---- Could not Revert", zap.Error(revertErr), justCopied.Zap())
				}
			}
			publishError(sourceDs, childNode.Path)
			return moveErr
		}
		logger.Debug("-- Delete Success " + childNode.Path)
	}

	return nil
}
