/*
 * Copyright (c) 2018. Abstrium SAS <team (at) pydio.com>
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

package tasks

import (
	"context"
	"sync"
	"time"

	"github.com/cskr/pubsub"
	"github.com/micro/go-micro/client"
	"github.com/micro/go-micro/metadata"
	"github.com/micro/go-micro/server"

	"github.com/pydio/cells/common"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/idm"
	"github.com/pydio/cells/common/proto/jobs"
	"github.com/pydio/cells/common/proto/tree"
	"github.com/pydio/cells/common/service"
	"github.com/pydio/cells/common/service/context"
	"github.com/pydio/cells/common/utils/cache"
	"github.com/pydio/cells/common/utils/permissions"
)

const (
	PubSubTopicTaskStatuses = "tasks"
	PubSubTopicControl      = "control"
)

var (
	PubSub *pubsub.PubSub
)

// Subscriber handles incoming events, applies selectors if any
// and generates all ActionMessage to trigger actions
type Subscriber struct {
	Client          client.Client
	MainQueue       chan Runnable
	UpdateTasksChan chan *jobs.Task

	JobsDefinitions map[string]*jobs.Job
	Dispatchers     map[string]*Dispatcher

	jobsLock    *sync.RWMutex
	RootContext context.Context
	batcher     *cache.EventsBatcher
}

// NewSubscriber creates a multiplexer for tasks managements and messages
// by maintaining a map of dispacher, one for each job definition.
func NewSubscriber(parentContext context.Context, client client.Client, server server.Server) *Subscriber {

	s := &Subscriber{
		Client:          client,
		JobsDefinitions: make(map[string]*jobs.Job),
		MainQueue:       make(chan Runnable),
		UpdateTasksChan: make(chan *jobs.Task),
		Dispatchers:     make(map[string]*Dispatcher),
		jobsLock:        &sync.RWMutex{},
	}

	PubSub = pubsub.New(0)

	s.RootContext = context.WithValue(parentContext, common.PYDIO_CONTEXT_USER_KEY, common.PYDIO_SYSTEM_USERNAME)

	s.batcher = cache.NewEventsBatcher(s.RootContext, 2*time.Second, 20*time.Second, 2000, s.processNodeEvent)

	server.Subscribe(server.NewSubscriber(common.TOPIC_JOB_CONFIG_EVENT, s.jobsChangeEvent))
	server.Subscribe(server.NewSubscriber(common.TOPIC_TREE_CHANGES, s.nodeEvent))
	server.Subscribe(server.NewSubscriber(common.TOPIC_META_CHANGES, func(ctx context.Context, e *tree.NodeChangeEvent) error {
		if e.Type == tree.NodeChangeEvent_UPDATE_META || e.Type == tree.NodeChangeEvent_UPDATE_USER_META {
			return s.nodeEvent(ctx, e)
		} else {
			return nil
		}
	}))
	server.Subscribe(server.NewSubscriber(common.TOPIC_TIMER_EVENT, s.timerEvent))
	server.Subscribe(server.NewSubscriber(common.TOPIC_IDM_EVENT, s.idmEvent))

	s.ListenToMainQueue()
	s.TaskChannelSubscription()

	return s
}

// Init subscriber with current list of jobs from Jobs service
func (s *Subscriber) Init() error {

	go service.Retry(func() error {
		// Load Jobs Definitions
		jobClients := jobs.NewJobServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_JOBS, s.Client)
		streamer, e := jobClients.ListJobs(s.RootContext, &jobs.ListJobsRequest{})
		if e != nil {
			return e
		}

		s.jobsLock.Lock()
		defer s.jobsLock.Unlock()
		for {
			resp, er := streamer.Recv()
			if er != nil {
				break
			}
			if resp == nil {
				continue
			}
			if resp.Job.Inactive {
				continue
			}
			s.JobsDefinitions[resp.Job.ID] = resp.Job
			s.GetDispatcherForJob(resp.Job)
		}
		return nil
	}, 3*time.Second, 20*time.Second)

	return nil
}

// Stop closes internal EventsBatcher
func (s *Subscriber) Stop() {
	s.batcher.Done <- true
}

// ListenToMainQueue starts a go routine that listens to the Event Bus
func (s *Subscriber) ListenToMainQueue() {

	go func() {
		for {
			select {
			case runnable := <-s.MainQueue:
				dispatcher := s.GetDispatcherForJob(runnable.Task.Job)
				dispatcher.JobQueue <- runnable
			}
		}
	}()

}

// TaskChannelSubscription uses PubSub library to receive update messages from tasks
func (s *Subscriber) TaskChannelSubscription() {
	ch := PubSub.Sub(PubSubTopicTaskStatuses)
	cli := NewTaskReconnectingClient(s.RootContext)
	cli.StartListening(ch)
	//	s.chanToStream(ch)
}

// GetDispatcherForJob creates a new dispatcher for a job
func (s *Subscriber) GetDispatcherForJob(job *jobs.Job) *Dispatcher {

	if d, exists := s.Dispatchers[job.ID]; exists {
		return d
	}
	maxWorkers := DefaultMaximumWorkers
	if job.MaxConcurrency > 0 {
		maxWorkers = int(job.MaxConcurrency)
	}
	tags := map[string]string{
		"service": common.SERVICE_GRPC_NAMESPACE_ + common.SERVICE_TASKS,
		"jobID":   job.ID,
	}
	dispatcher := NewDispatcher(maxWorkers, tags)
	s.Dispatchers[job.ID] = dispatcher
	dispatcher.Run()
	return dispatcher
}

// Job Configuration was updated, react accordingly
func (s *Subscriber) jobsChangeEvent(ctx context.Context, msg *jobs.JobChangeEvent) error {
	s.jobsLock.Lock()
	defer s.jobsLock.Unlock()
	// Update config
	if msg.JobRemoved != "" {
		if _, ok := s.JobsDefinitions[msg.JobRemoved]; ok {
			delete(s.JobsDefinitions, msg.JobRemoved)
		}
		// TODO: Shall we stop everything when changing config?
		if dispatcher, ok := s.Dispatchers[msg.JobRemoved]; ok {
			dispatcher.Stop()
			delete(s.Dispatchers, msg.JobRemoved)
		}
	}
	if msg.JobUpdated != nil {
		s.JobsDefinitions[msg.JobUpdated.ID] = msg.JobUpdated
		// TODO: Shall we stop everything when changing config? Or wait that it's idle for next time?
		if dispatcher, ok := s.Dispatchers[msg.JobUpdated.ID]; ok {
			dispatcher.Stop()
			delete(s.Dispatchers, msg.JobUpdated.ID)
			if !msg.JobUpdated.Inactive {
				s.GetDispatcherForJob(msg.JobUpdated)
			}
		}
	}

	return nil
}

// Reacts to a trigger sent by the timer service
func (s *Subscriber) timerEvent(ctx context.Context, event *jobs.JobTriggerEvent) error {
	jobId := event.JobID
	// Load Job Data, build selectors
	s.jobsLock.Lock()
	defer s.jobsLock.Unlock()
	j, ok := s.JobsDefinitions[jobId]
	if !ok {
		// Try to load definition directly for JobsService
		jobClients := jobs.NewJobServiceClient(common.SERVICE_GRPC_NAMESPACE_+common.SERVICE_JOBS, s.Client)
		resp, e := jobClients.GetJob(ctx, &jobs.GetJobRequest{JobID: jobId})
		if e != nil || resp.Job == nil {
			return nil
		}
		j = resp.Job
	}
	if j.Inactive {
		return nil
	}
	// This timer event probably comes without user in context at that point
	if u, _ := permissions.FindUserNameInContext(ctx); u == "" {
		ctx = metadata.NewContext(ctx, metadata.Metadata{common.PYDIO_CONTEXT_USER_KEY: common.PYDIO_SYSTEM_USERNAME})
		ctx = context.WithValue(ctx, common.PYDIO_CONTEXT_USER_KEY, common.PYDIO_SYSTEM_USERNAME)
	}
	ctx = servicecontext.WithServiceName(ctx, servicecontext.GetServiceName(s.RootContext))
	ctx = servicecontext.WithServiceColor(ctx, servicecontext.GetServiceColor(s.RootContext))
	log.Logger(ctx).Info("Run Job " + jobId + " on timer event " + event.Schedule.String())

	task := NewTaskFromEvent(ctx, j, event)

	go task.EnqueueRunnables(s.Client, s.MainQueue)

	return nil
}

// Reacts to a trigger linked to a nodeChange event.
func (s *Subscriber) nodeEvent(ctx context.Context, event *tree.NodeChangeEvent) error {

	if event.Optimistic {
		return nil
	}

	// Always ignore events on Temporary nodes
	if event.Target != nil && event.Target.Etag == common.NODE_FLAG_ETAG_TEMPORARY {
		return nil
	}

//	s.jobsLock.Lock()
//	defer s.jobsLock.Unlock()

	ctx = servicecontext.WithServiceName(ctx, servicecontext.GetServiceName(s.RootContext))
	ctx = servicecontext.WithServiceColor(ctx, servicecontext.GetServiceColor(s.RootContext))

	s.batcher.Events <- &cache.EventWithContext{
		NodeChangeEvent: *event,
		Ctx:             ctx,
	}

	/*
		for jobId, jobData := range s.JobsDefinitions {
			if jobData.Inactive {
				continue
			}
			if jobData.NodeEventFilter != nil && !s.jobLevelFilterPass(event, jobData.NodeEventFilter) {
				continue
			}
			for _, eName := range jobData.EventNames {
				if eType, ok := jobs.ParseNodeChangeEventName(eName); ok {
					if event.Type == eType {
						log.Logger(ctx).Debug("Run Job " + jobId + " on event " + eName)
						task := NewTaskFromEvent(ctx, jobData, event)
						go task.EnqueueRunnables(s.Client, s.MainQueue)
					}
				}
			}
		}
	*/
	return nil
}

func (s *Subscriber) processNodeEvent(ctx context.Context, event *tree.NodeChangeEvent) {

	s.jobsLock.Lock()
	defer s.jobsLock.Unlock()

	for jobId, jobData := range s.JobsDefinitions {
		if jobData.Inactive {
			continue
		}
		if jobData.NodeEventFilter != nil && !s.jobLevelFilterPass(event, jobData.NodeEventFilter) {
			continue
		}
		for _, eName := range jobData.EventNames {
			if eType, ok := jobs.ParseNodeChangeEventName(eName); ok {
				if event.Type == eType {
					log.Logger(ctx).Debug("Run Job " + jobId + " on event " + eName)
					task := NewTaskFromEvent(ctx, jobData, event)
					go task.EnqueueRunnables(s.Client, s.MainQueue)
				}
			}
		}
	}

}

// Reacts to a trigger linked to a nodeChange event.
func (s *Subscriber) idmEvent(ctx context.Context, event *idm.ChangeEvent) error {

	s.jobsLock.Lock()
	defer s.jobsLock.Unlock()

	ctx = servicecontext.WithServiceName(ctx, servicecontext.GetServiceName(s.RootContext))
	ctx = servicecontext.WithServiceColor(ctx, servicecontext.GetServiceColor(s.RootContext))

	for jobId, jobData := range s.JobsDefinitions {
		if jobData.Inactive {
			continue
		}
		for _, eName := range jobData.EventNames {
			if jobs.MatchesIdmChangeEvent(eName, event) {
				log.Logger(ctx).Debug("Run Job " + jobId + " on event " + eName)
				task := NewTaskFromEvent(ctx, jobData, event)
				go task.EnqueueRunnables(s.Client, s.MainQueue)
			}
		}
	}
	return nil
}

// Check if a node must go through jobs at all (if there is a NodesSelector at the job level)
func (s *Subscriber) jobLevelFilterPass(event *tree.NodeChangeEvent, filter *jobs.NodesSelector) bool {
	var refNode *tree.Node
	if event.Target != nil {
		refNode = event.Target
	} else if event.Source != nil {
		refNode = event.Source
	}
	if refNode == nil {
		return true // Ignore
	}
	input := jobs.ActionMessage{Nodes: []*tree.Node{refNode}}
	output := filter.Filter(input)
	if output.Nodes == nil || len(output.Nodes) == 0 {
		return false
	}
	return true
}
