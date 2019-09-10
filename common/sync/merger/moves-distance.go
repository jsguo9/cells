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
	"math"
	"path"
	"sort"
	"strings"

	"github.com/pydio/cells/common/proto/tree"
	"github.com/pydio/cells/common/utils/mtree"
	"go.uber.org/zap/zapcore"
)

const (
	maxUint = ^uint(0)
	maxInt  = int(maxUint >> 1)
)

type Move struct {
	deleteOp Operation
	createOp Operation
	dbNode   *tree.Node

	source   string
	target   string
	depth    int
	distance int
	sameBase bool
}

func (m *Move) folderDepth() int {
	return len(strings.Split(strings.Trim(m.source, "/"), "/"))
}

func (m *Move) prepare() {
	m.source = m.deleteOp.GetRefPath()
	m.target = m.createOp.GetRefPath()
	m.depth = m.folderDepth()
	m.distance = m.closeness()
}

func (m *Move) closeness() int {
	sep := "/"
	if m.source == m.target {
		return maxInt
	}
	pref := mtree.CommonPrefix(sep[0], m.source, m.target)
	prefFactor := len(strings.Split(pref, sep))
	// Overall path similarity
	lParts := strings.Split(m.source, sep)
	rParts := strings.Split(m.target, sep)
	reverseStringSlice(lParts)
	reverseStringSlice(rParts)

	max := math.Max(float64(len(lParts)), float64(len(rParts)))
	dist := 1
	for i := 0; i < int(max); i++ {
		pL, pR := "", ""
		if i < len(lParts) {
			pL = lParts[i]
		}
		if i < len(rParts) {
			pR = rParts[i]
		}
		if pL == pR {
			dist += 5
		}
	}
	return dist * prefFactor
}

func (m *Move) MarshalLogObject(encoder zapcore.ObjectEncoder) error {
	if m == nil {
		return nil
	}
	encoder.AddString("From", m.deleteOp.GetRefPath())
	encoder.AddString("To", m.createOp.GetRefPath())
	encoder.AddObject("DbNode", m.dbNode)
	return nil
}

func (m *Move) SameBase() bool {
	return path.Base(m.deleteOp.GetRefPath()) == path.Base(m.createOp.GetRefPath())
}

// sortClosestMoves currently has an exponential complexity
// it should be rewritten as moving tons of files with similar eTag
// will inflate cpu/memory usage very quickly
func sortClosestMoves(possibleMoves []*Move) (moves []*Move) {

	l := len(possibleMoves)
	for _, m := range possibleMoves {
		m.prepare()
	}

	// Dedup by source
	greatestSource := make(map[string]*Move, l)
	targets := make(map[string]bool, l)
	sort.Slice(possibleMoves, func(i, j int) bool {
		return possibleMoves[i].depth > possibleMoves[j].depth
	})
	for _, m := range possibleMoves {
		for _, m2 := range possibleMoves {
			byT, ok := greatestSource[m.source]
			if m2.source != m.source {
				continue
			}
			if _, alreadyUsed := targets[m2.target]; alreadyUsed {
				continue
			}
			if !ok || m2.distance > byT.distance || m2.sameBase && !byT.sameBase {
				greatestSource[m.source] = m2
			}
		}
		if m, ok := greatestSource[m.source]; ok {
			targets[m.target] = true
		}
	}

	// Dedup by target
	greatestTarget := make(map[string]*Move, l)
	for _, m := range greatestSource {
		byT, ok := greatestTarget[m.target]
		if !ok || m.distance > byT.distance {
			greatestTarget[m.target] = m
		}
	}

	for _, m := range greatestTarget {
		moves = append(moves, m)
	}

	return
}

func reverseStringSlice(ss []string) {
	last := len(ss) - 1
	for i := 0; i < len(ss)/2; i++ {
		ss[i], ss[last-i] = ss[last-i], ss[i]
	}
}
