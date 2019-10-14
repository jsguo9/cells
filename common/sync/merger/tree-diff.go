/*
 * Copyright (c) 2019. Abstrium SAS <team (at) pydio.com>
 * This file is part of Pydio Cells.
 *
 * Pydio Cells is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio Cells is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio Cells.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

package merger

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/gobwas/glob"
	"go.uber.org/zap"

	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/tree"
	"github.com/pydio/cells/common/sync/model"
)

// Conflict represent a conflict between two nodes at the same path
type DiffConflict struct {
	Type      ConflictType
	NodeLeft  *tree.Node
	NodeRight *tree.Node
}

// Diff represent basic differences between two sources
// It can be then transformed to Patch, depending on the sync being
// unidirectional (transform to Creates and Deletes) or bidirectional (transform only to Creates)
type TreeDiff struct {
	left  model.PathSyncSource
	right model.PathSyncSource

	missingLeft  []*tree.Node
	missingRight []*tree.Node
	conflicts    []*DiffConflict
	ctx          context.Context

	cmd        *model.Command
	statusChan chan model.Status
	doneChan   chan interface{}
}

// newTreeDiff instanciate a new TreeDiff
func newTreeDiff(ctx context.Context, left model.PathSyncSource, right model.PathSyncSource) *TreeDiff {
	return &TreeDiff{
		ctx:   ctx,
		left:  left,
		right: right,
	}
}

// Compute performs the actual diff between left and right
func (diff *TreeDiff) Compute(root string, lock chan bool, ignores ...glob.Glob) error {
	defer func() {
		diff.Done(true)
		// Wait that monitor has finished its messaging before returning function
		if lock != nil {
			<-lock
		}
	}()

	lTree := NewTree()
	rTree := NewTree()
	var errs []error
	wg := &sync.WaitGroup{}

	for _, k := range []string{"left", "right"} {
		wg.Add(1)
		go func(logId string) {
			start := time.Now()
			h := ""
			uri := diff.left.GetEndpointInfo().URI
			if k == "right" {
				uri = diff.right.GetEndpointInfo().URI
			}
			defer func() {
				s := model.NewProcessingStatus(fmt.Sprintf("[%s] Snapshot loaded in %v - Root Hash is %s", logId, time.Now().Sub(start), h)).SetEndpoint(uri)
				diff.Status(s)
				wg.Done()
			}()
			st := model.NewProcessingStatus(fmt.Sprintf("[%s] Loading snapshot", logId)).SetEndpoint(uri)
			diff.Status(st)
			var err error
			if logId == "left" {
				if lTree, err = TreeNodeFromSource(diff.left, root, ignores, diff.statusChan); err == nil {
					h = lTree.GetHash()
				}
			} else if logId == "right" {
				if rTree, err = TreeNodeFromSource(diff.right, root, ignores, diff.statusChan); err == nil {
					h = rTree.GetHash()
				}
			}
			if err != nil {
				errs = append(errs, err)
			}
		}(k)
	}
	wg.Wait()
	if len(errs) > 0 {
		return errs[0]
	}

	diff.Status(model.NewProcessingStatus("Computing diff between snapshots"))

	//fmt.Println(lTree.PrintTree())
	//fmt.Println(rTree.PrintTree())
	diff.mergeNodes(lTree, rTree)
	log.Logger(diff.ctx).Info("Diff Stats", zap.Any("s", diff.Stats()))

	diff.Status(model.NewProcessingStatus(fmt.Sprintf("Diff contents: missing left %v - missing right %v", len(diff.missingLeft), len(diff.missingRight))))
	return nil

}

// ToUnidirectionalPatch transforms this diff to a patch
func (diff *TreeDiff) ToUnidirectionalPatch(direction model.DirectionType, patch Patch) (err error) {

	_, rightOk := diff.right.(model.PathSyncTarget)
	_, leftOk := diff.left.(model.PathSyncTarget)

	if direction == model.DirectionRight && rightOk {
		diff.toMissing(patch, diff.missingRight, true, false)
		diff.toMissing(patch, diff.missingRight, false, false)
		diff.toMissing(patch, diff.missingLeft, false, true)
	} else if direction == model.DirectionLeft && leftOk {
		diff.toMissing(patch, diff.missingLeft, true, false)
		diff.toMissing(patch, diff.missingLeft, false, false)
		diff.toMissing(patch, diff.missingRight, false, true)
	} else {
		return errors.New("error while extracting unidirectional patch. either left or right is not a sync target")
	}
	for _, c := range diff.conflictsByType(ConflictFileContent) {
		var n *tree.Node
		if direction == model.DirectionRight {
			n = c.NodeLeft
		} else if direction == model.DirectionLeft {
			n = c.NodeRight
		} else {
			n = MostRecentNode(c.NodeLeft, c.NodeRight)
		}
		patch.Enqueue(NewOperation(OpUpdateFile, model.NodeToEventInfo(diff.ctx, n.Path, n, model.EventCreate), n))
	}
	log.Logger(diff.ctx).Info("Sending unidirectional patch", zap.Any("patch", patch.Stats()))
	return
}

// ToBidirectionalPatch computes a bidirectional patch from this diff using the given targets
func (diff *TreeDiff) ToBidirectionalPatch(leftTarget model.PathSyncTarget, rightTarget model.PathSyncTarget, patch *BidirectionalPatch) (err error) {

	var b *BidirectionalPatch
	defer func() {
		if b != nil {
			patch.AppendBranch(diff.ctx, b)
		}
	}()

	diff.solveConflicts(diff.ctx)

	leftPatch, rightPatch := diff.leftAndRightPatches(leftTarget, rightTarget)
	b, err = ComputeBidirectionalPatch(diff.ctx, leftPatch, rightPatch)
	if err != nil {
		return
	}

	// Re-enqueue Diff conflicts to Patch conflicts
	for _, c := range diff.conflicts {
		var leftOp, rightOp Operation
		if c.NodeLeft.IsLeaf() {
			leftOp = NewOperation(OpCreateFile, model.EventInfo{Path: c.NodeLeft.Path}, c.NodeLeft)
		} else {
			leftOp = NewOperation(OpCreateFolder, model.EventInfo{Path: c.NodeLeft.Path}, c.NodeLeft)
		}
		if c.NodeRight.IsLeaf() {
			rightOp = NewOperation(OpCreateFile, model.EventInfo{Path: c.NodeRight.Path}, c.NodeRight)
		} else {
			rightOp = NewOperation(OpCreateFolder, model.EventInfo{Path: c.NodeRight.Path}, c.NodeRight)
		}
		b.Enqueue(NewConflictOperation(c.NodeLeft, c.Type, leftOp, rightOp))
	}
	if _, ok := b.HasErrors(); ok {
		err = fmt.Errorf("diff has conflicts")
	}
	return
}

// leftAndRightPatches provides two patches from this diff, to be used as input for a BidirPatch computation
func (diff *TreeDiff) leftAndRightPatches(leftTarget model.PathSyncTarget, rightTarget model.PathSyncTarget) (leftPatch Patch, rightPatch Patch) {

	leftPatch = NewPatch(leftTarget.(model.PathSyncSource), rightTarget, PatchOptions{MoveDetection: true})
	if rightTarget != nil {
		diff.toMissing(leftPatch, diff.missingRight, true, false)
		diff.toMissing(leftPatch, diff.missingRight, false, false)
	}

	rightPatch = NewPatch(rightTarget.(model.PathSyncSource), leftTarget, PatchOptions{MoveDetection: true})
	if leftTarget != nil {
		diff.toMissing(rightPatch, diff.missingLeft, true, false)
		diff.toMissing(rightPatch, diff.missingLeft, false, false)
	}
	return

}

// Status sends status to internal channel
func (diff *TreeDiff) Status(status model.Status) {
	if diff.statusChan != nil {
		diff.statusChan <- status
	}
}

// SetupChannels registers status chan internally. Done chan is ignored
func (diff *TreeDiff) SetupChannels(status chan model.Status, done chan interface{}, cmd *model.Command) {
	diff.statusChan = status
	diff.doneChan = done
	diff.cmd = cmd
}

func (diff *TreeDiff) Done(info interface{}) {
	if diff.doneChan != nil {
		diff.doneChan <- info
	}
}

// String provides a string representation of this diff
func (diff *TreeDiff) String() string {
	output := ""
	if len(diff.missingLeft) > 0 {
		output += "\n missingLeft : "
		for _, node := range diff.missingLeft {
			output += "\n " + node.Path
		}
	}
	if len(diff.missingRight) > 0 {
		output += "\n missingRight : "
		for _, node := range diff.missingRight {
			output += "\n " + node.Path
		}
	}
	if len(diff.conflicts) > 0 {
		output += "\n Diverging conflicts : "
		for _, c := range diff.conflicts {
			output += "\n " + c.NodeLeft.Path
		}
	}
	return output
}

// Stats provides info about the diff internals
func (diff *TreeDiff) Stats() map[string]interface{} {
	return map[string]interface{}{
		"EndpointLeft":  diff.left.GetEndpointInfo().URI,
		"EndpointRight": diff.right.GetEndpointInfo().URI,
		"missingLeft":   len(diff.missingLeft),
		"missingRight":  len(diff.missingRight),
		"conflicts":     len(diff.conflicts),
	}
}

// mergeNodes will recursively detect differences between two hash trees.
func (diff *TreeDiff) mergeNodes(left *TreeNode, right *TreeNode) {
	if left.GetHash() == right.GetHash() {
		return
	}
	if left.Type != right.Type {
		// Node changed of type - Register conflict and keep browsing
		diff.conflicts = append(diff.conflicts, &DiffConflict{
			Type:      ConflictNodeType,
			NodeLeft:  &left.Node,
			NodeRight: &right.Node,
		})
	} else if !left.IsLeaf() && left.Uuid != right.Uuid {
		// Folder has different UUID - Register conflict and keep browsing
		diff.conflicts = append(diff.conflicts, &DiffConflict{
			Type:      ConflictFolderUUID,
			NodeLeft:  &left.Node,
			NodeRight: &right.Node,
		})
	} else if left.IsLeaf() {
		// Files differ - Register conflict and return (no children)
		diff.conflicts = append(diff.conflicts, &DiffConflict{
			Type:      ConflictFileContent,
			NodeLeft:  &left.Node,
			NodeRight: &right.Node,
		})
		return
	}
	cL := left.GetCursor()
	cR := right.GetCursor()
	a := cL.Next()
	b := cR.Next()
	for a != nil || b != nil {
		if a != nil && b != nil {
			switch strings.Compare(a.Label(), b.Label()) {
			case 0:
				diff.mergeNodes(a, b)
				a = cL.Next()
				b = cR.Next()
				continue
			case 1:
				diff.missingLeft = b.Enqueue(diff.missingLeft)
				b = cR.Next()
				continue
			case -1:
				diff.missingRight = a.Enqueue(diff.missingRight)
				a = cL.Next()
				continue
			}
		} else if a == nil && b != nil {
			diff.missingLeft = b.Enqueue(diff.missingLeft)
			b = cR.Next()
			continue
		} else if b == nil && a != nil {
			diff.missingRight = a.Enqueue(diff.missingRight)
			a = cL.Next()
			continue
		}
	}
}

// toMissing transforms Missing slices to BatchEvents
func (diff *TreeDiff) toMissing(patch Patch, in []*tree.Node, folders bool, removes bool) {

	var eventType model.EventType
	var batchEventType OperationType
	if removes {
		eventType = model.EventRemove
		batchEventType = OpDelete
	} else {
		eventType = model.EventCreate
		if folders {
			batchEventType = OpCreateFolder
		} else {
			batchEventType = OpCreateFile
		}
	}

	for _, n := range in {
		if removes || !folders && n.IsLeaf() || folders && !n.IsLeaf() {
			eventInfo := model.NodeToEventInfo(diff.ctx, n.Path, n, eventType)
			patch.Enqueue(NewOperation(batchEventType, eventInfo, n))
		}
	}

}

// solveConflicts tries to fix existing conflicts and return remaining ones
func (diff *TreeDiff) solveConflicts(ctx context.Context) {

	right := diff.right
	left := diff.left
	var remaining []*DiffConflict

	// Try to refresh UUIDs on target
	var refresher model.UuidFoldersRefresher
	var canRefresh, refresherRight, refresherLeft bool
	if refresher, canRefresh = right.(model.UuidFoldersRefresher); canRefresh {
		refresherRight = true
	} else if refresher, canRefresh = left.(model.UuidFoldersRefresher); canRefresh {
		refresherLeft = true
	}
	for _, c := range diff.conflicts {
		var solved bool

		if c.Type == ConflictFolderUUID && canRefresh {
			var srcUuid *tree.Node
			if refresherRight {
				srcUuid = c.NodeLeft
			} else if refresherLeft {
				srcUuid = c.NodeRight
			}
			if _, e := refresher.UpdateFolderUuid(ctx, srcUuid); e == nil {
				solved = true
			}
		} else if c.Type == ConflictFileContent {
			// What can we do?
		}

		if !solved {
			remaining = append(remaining, c)
		}
	}

	diff.conflicts = remaining
	return
}

// conflictsByType filters a slice of conflicts for a given type
func (diff *TreeDiff) conflictsByType(conflictType ConflictType) (conflicts []*DiffConflict) {
	for _, c := range diff.conflicts {
		if c.Type == conflictType {
			conflicts = append(conflicts, c)
		}
	}
	return
}
