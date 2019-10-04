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

package registry

import (
	"fmt"
	"time"

	"github.com/pydio/cells/common/micro"
)

// ListRunningServices returns a list of services that are registered with the main registry
// They may or may not belong to the app registry so we create a mock service in case they don't
func (c *pydioregistry) ListRunningServices() ([]Service, error) {

	var services []Service

	for _, p := range GetPeers() {

		for _, rs := range p.GetServices() {
			if s, ok := c.register[rs.Name]; ok {
				services = append(services, s)
			} else {
				services = append(services, NewMockFromMicroService(rs))
			}
		}
	}

	// De-dup
	result := services[:0]
	encountered := map[string]bool{}
	for _, s := range services {
		name := s.Name()
		if encountered[name] == true {
			// Do not add duplicate.
		} else {
			encountered[name] = true
			result = append(result, s)
		}
	}

	return result, nil
}

// SetServiceStopped artificially removes a service from the running services list
// This may be necessary for processes started as forks and crashing unexpectedly
func (c *pydioregistry) SetServiceStopped(name string) error {
	// c.runningmutex.Lock()
	// defer c.runningmutex.Unlock()
	// for k, v := range c.running {
	// 	if v.Name == name {
	// 		c.running = append(c.running[:k], c.running[k+1:]...)
	// 		break
	// 	}
	// }
	return nil
}

// maintain a list of services currently running for easy discovery
func (c *pydioregistry) maintainRunningServicesList() {

	// start := time.Now()
	// initialServices, _ := defaults.Registry().ListServices()
	// //for _, r := range initialServices {
	// // Initially, we retrieve each service to ensure we have the correct list
	// // services, _ := defaults.Registry().GetService(r.Name)
	// // for _, s := range services {
	// // 	for _, n := range s.Nodes {

	// // 		// _, err := net.Dial("tcp", fmt.Sprintf("%s:%d", n.Address, n.Port))
	// // 		// if err != nil {
	// // 		// 	continue
	// // 		// }

	// // 		c.GetPeer(n).Add(s, fmt.Sprintf("%d", n.Port))
	// // 		c.registerProcessFromNode(n, s.Name)
	// // 	}
	// // }
	// //}
	// elapsed := time.Since(start)
	// fmt.Printf("Binomial took %s", elapsed)

	// fmt.Println(initialServices)

	go func() {

		// Once we've retrieved the list once, we watch the services
		w, err := defaults.Registry().Watch()
		if err != nil {
			return
		}

		for {
			res, err := w.Next()
			if err != nil {
				<-time.After(5 * time.Second)
				continue
			}

			if res == nil {
				continue
			}

			a := res.Action
			s := res.Service

			switch a {
			case "create":
				for _, n := range s.Nodes {
					c.GetPeer(n).Add(s, fmt.Sprintf("%d", n.Port))
					c.registerProcessFromNode(n, s.Name)
				}
			case "delete":
				for _, n := range s.Nodes {
					c.GetPeer(n).Delete(s, fmt.Sprintf("%d", n.Port))
					c.deregisterProcessFromNode(n, s.Name)
				}
			}
		}
	}()
}
