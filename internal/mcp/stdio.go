package mcp

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"sync"
)

// ServeStdio runs the MCP server over newline-delimited JSON-RPC on
// in/out (typically os.Stdin/os.Stdout). One JSON object per line.
func (s *Server) ServeStdio(ctx context.Context, in io.Reader, out io.Writer) error {
	sc := bufio.NewScanner(in)
	sc.Buffer(make([]byte, 0, 64*1024), 8*1024*1024)
	enc := json.NewEncoder(out)
	var wmu sync.Mutex

	for sc.Scan() {
		line := sc.Bytes()
		if len(line) == 0 {
			continue
		}
		var req Request
		if err := json.Unmarshal(line, &req); err != nil {
			wmu.Lock()
			_ = enc.Encode(fail(nil, codeParseError, "JSON inválido"))
			wmu.Unlock()
			continue
		}
		resp := s.Handle(ctx, &req)
		if resp == nil {
			continue // notification
		}
		wmu.Lock()
		err := enc.Encode(resp)
		wmu.Unlock()
		if err != nil {
			return err
		}
	}
	return sc.Err()
}
