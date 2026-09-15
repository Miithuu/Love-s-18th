"""
Range-enabled local HTTP server for smooth video streaming and scrubbing.
Prevents ConnectionResetError [WinError 10054] by supporting 206 Partial Content
and handling browser client socket disconnects gracefully.
"""
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

import socket

class RangeHTTPServer(HTTPServer):
    def handle_error(self, request, client_address):
        exc_type, _, _ = sys.exc_info()
        if exc_type in (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, OSError):
            # Client closed connection (e.g. browser seeking or finished buffering video chunk)
            return
        super().handle_error(request, client_address)

class DualStackRangeHTTPServer(RangeHTTPServer):
    address_family = socket.AF_INET6
    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except (AttributeError, OSError):
            pass
        super().server_bind()

class RangeHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def handle(self):
        try:
            super().handle()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, OSError):
            pass

    def finish(self):
        try:
            super().finish()
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, OSError):
            pass

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()

        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None

        try:
            fs = os.fstat(f.fileno())
            file_len = fs[6]
            range_header = self.headers.get('Range')

            if range_header and range_header.startswith('bytes='):
                range_spec = range_header.split('=', 1)[1].strip()
                if ',' in range_spec:
                    return super().send_head()

                start_str, end_str = range_spec.split('-', 1)
                start = int(start_str) if start_str else 0
                end = int(end_str) if end_str else file_len - 1

                if start >= file_len:
                    self.send_error(416, "Requested Range Not Satisfiable")
                    f.close()
                    return None

                end = min(end, file_len - 1)
                length = end - start + 1

                self.send_response(206)
                ctype = self.guess_type(path)
                self.send_header("Content-type", ctype)
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_len}")
                self.send_header("Content-Length", str(length))
                self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
                self.end_headers()

                f.seek(start)
                self._range_end = end
                return f
            else:
                return super().send_head()
        except Exception:
            f.close()
            raise

    def copyfile(self, source, outputfile):
        try:
            if hasattr(self, '_range_end'):
                remaining = self._range_end - source.tell() + 1
                chunk_size = 64 * 1024
                while remaining > 0:
                    read_len = min(remaining, chunk_size)
                    buf = source.read(read_len)
                    if not buf:
                        break
                    outputfile.write(buf)
                    remaining -= len(buf)
            else:
                super().copyfile(source, outputfile)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, OSError):
            # Normal browser behavior: closed socket after buffering needed video frames
            pass

    def log_message(self, format, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))

if __name__ == '__main__':
    port = 8080
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    try:
        server = DualStackRangeHTTPServer(('::', port), RangeHTTPRequestHandler)
    except Exception:
        server = RangeHTTPServer(('0.0.0.0', port), RangeHTTPRequestHandler)
    print(f"Nandika Birthday Server (Dual-Stack & Range Streaming Enabled) running on http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
