<!-- AUTO GENERATED DO NOT EDIT - run 'npm run docs' to update-->

# Chrome DevTools MCP Tool Reference

- **[Navigation automation](#navigation-automation)** (4 tools)
  - [`list_pages`](#list_pages)
  - [`navigate_page`](#navigate_page)
  - [`new_page`](#new_page)
  - [`select_page`](#select_page)
- **[Network](#network)** (6 tools)
  - [`analyze_websocket_messages`](#analyze_websocket_messages)
  - [`get_network_request`](#get_network_request)
  - [`get_websocket_message`](#get_websocket_message)
  - [`get_websocket_messages`](#get_websocket_messages)
  - [`list_network_requests`](#list_network_requests)
  - [`list_websocket_connections`](#list_websocket_connections)
- **[Debugging](#debugging)** (6 tools)
  - [`evaluate_script`](#evaluate_script)
  - [`get_console_message`](#get_console_message)
  - [`list_console_messages`](#list_console_messages)
  - [`list_frames`](#list_frames)
  - [`select_frame`](#select_frame)
  - [`take_screenshot`](#take_screenshot)
- **[JS Reverse Engineering](#js-reverse-engineering)** (19 tools)
  - [`break_on_xhr`](#break_on_xhr)
  - [`get_paused_info`](#get_paused_info)
  - [`get_request_initiator`](#get_request_initiator)
  - [`get_script_source`](#get_script_source)
  - [`inject_before_load`](#inject_before_load)
  - [`list_breakpoints`](#list_breakpoints)
  - [`list_scripts`](#list_scripts)
  - [`pause`](#pause)
  - [`remove_all_breakpoints`](#remove_all_breakpoints)
  - [`remove_breakpoint`](#remove_breakpoint)
  - [`remove_injected_script`](#remove_injected_script)
  - [`remove_xhr_breakpoint`](#remove_xhr_breakpoint)
  - [`resume`](#resume)
  - [`search_in_sources`](#search_in_sources)
  - [`set_breakpoint_on_text`](#set_breakpoint_on_text)
  - [`step_into`](#step_into)
  - [`step_out`](#step_out)
  - [`step_over`](#step_over)
  - [`trace_function`](#trace_function)

## Navigation automation

### `list_pages`

**Description:** Get a list of pages open in the browser.

**Parameters:** None

---

### `navigate_page`

**Description:** Navigates the currently selected page to a URL, or performs back/forward/reload navigation. Waits for DOMContentLoaded event (not full page load). Default timeout is 10 seconds. After navigation, stale script IDs are cleared and fresh ones are captured automatically. All breakpoints (URL, XHR, DOM) are preserved across navigation.

**Parameters:**

- **ignoreCache** (boolean) _(optional)_: Whether to ignore cache on reload.
- **timeout** (integer) _(optional)_: Maximum wait time in milliseconds. If set to 0, the default timeout will be used.
- **type** (enum: "url", "back", "forward", "reload") _(optional)_: Navigate the page by URL, back or forward in history, or reload.
- **url** (string) _(optional)_: Target URL (only type=url)

---

### `new_page`

**Description:** Creates a new page and navigates to the specified URL. Waits for DOMContentLoaded event (not full page load). Default timeout is 10 seconds.

**Parameters:**

- **timeout** (integer) _(optional)_: Maximum wait time in milliseconds. If set to 0, the default timeout will be used.
- **url** (string) **(required)**: URL to load in a new page.

---

### `select_page`

**Description:** Select a page as a context for future tool calls.

**Parameters:**

- **pageIdx** (number) **(required)**: The index of the page to select. Call [`list_pages`](#list_pages) to list pages.

---

## Network

### `analyze_websocket_messages`

**Description:** Analyzes WebSocket messages and groups them by pattern/fingerprint. Essential for understanding binary/protobuf message types in live streaming scenarios. Returns statistics and sample indices for each message type.

**Parameters:**

- **direction** (enum: "sent", "received") _(optional)_: Only analyze messages in this direction.
- **wsid** (number) **(required)**: The wsid of the WebSocket connection to analyze.

---

### `get_network_request`

**Description:** Gets a network request by an optional reqid, if omitted returns the currently selected request in the DevTools Network panel.

**Parameters:**

- **reqid** (number) _(optional)_: The reqid of the network request. If omitted returns the currently selected request in the DevTools Network panel.

---

### `get_websocket_message`

**Description:** Gets a single WebSocket message by its frame index. Use [`get_websocket_messages`](#get_websocket_messages) or [`analyze_websocket_messages`](#analyze_websocket_messages) first to find the frame index.

**Parameters:**

- **frameIndex** (integer) **(required)**: The frame index (0-based) to retrieve.
- **wsid** (number) **(required)**: The wsid of the WebSocket connection.

---

### `get_websocket_messages`

**Description:** Gets messages for a WebSocket connection. IMPORTANT: For binary/protobuf messages (like live streaming), use [`analyze_websocket_messages`](#analyze_websocket_messages) FIRST to understand message types, then use groupId parameter to filter specific types. Default mode shows summary only.

**Parameters:**

- **direction** (enum: "sent", "received") _(optional)_: Filter by direction: "sent" or "received".
- **groupId** (string) _(optional)_: Filter by group ID (A, B, C, ...). Get group IDs from [`analyze_websocket_messages`](#analyze_websocket_messages) first.
- **pageIdx** (integer) _(optional)_: Page number (0-based).
- **pageSize** (integer) _(optional)_: Messages per page. Defaults to 10.
- **show_content** (boolean) _(optional)_: Set to true to show full message payload. Default false (summary only) to avoid large binary output.
- **wsid** (number) **(required)**: The wsid of the WebSocket connection.

---

### `list_network_requests`

**Description:** List network requests for the currently selected page since the last navigation. Results are sorted newest-first. By default returns the 20 most recent requests; use pageSize/pageIdx to paginate.

**Parameters:**

- **includePreservedRequests** (boolean) _(optional)_: Set to true to return the preserved requests over the last 3 navigations.
- **pageIdx** (integer) _(optional)_: Page number to return (0-based). When omitted, returns the first page.
- **pageSize** (integer) _(optional)_: Maximum number of requests to return. Defaults to 20.
- **resourceTypes** (array) _(optional)_: Filter requests to only return requests of the specified resource types. When omitted or empty, returns all requests.

---

### `list_websocket_connections`

**Description:** List all WebSocket connections. After getting wsid, use [`analyze_websocket_messages`](#analyze_websocket_messages)(wsid) FIRST to understand message patterns before viewing individual messages.

**Parameters:**

- **includePreservedConnections** (boolean) _(optional)_: Set to true to return the preserved connections over the last 3 navigations.
- **pageIdx** (integer) _(optional)_: Page number to return (0-based). When omitted, returns the first page.
- **pageSize** (integer) _(optional)_: Maximum number of connections to return. When omitted, returns all connections.
- **urlFilter** (string) _(optional)_: Filter connections by URL. Only connections containing this substring will be returned.

---

## Debugging

### `evaluate_script`

**Description:** Evaluate a JavaScript function inside the currently selected page. Returns the response as JSON
so returned values have to JSON-serializable. When execution is paused at a breakpoint, automatically evaluates in the paused call frame context.

**Parameters:**

- **function** (string) **(required)**: A JavaScript function declaration to be executed by the tool in the currently selected page.
  Example without arguments: `() => {
  return document.title
}` or `async () => {
  return await fetch("example.com")
}`.
  Example with arguments: `(el) => {
  return el.innerText;
}`

---

### `get_console_message`

**Description:** Gets a console message by its ID. You can get all messages by calling [`list_console_messages`](#list_console_messages).

**Parameters:**

- **msgid** (number) **(required)**: The msgid of a console message on the page from the listed console messages

---

### `list_console_messages`

**Description:** List all console messages for the currently selected page since the last navigation.

**Parameters:**

- **includePreservedMessages** (boolean) _(optional)_: Set to true to return the preserved messages over the last 3 navigations.
- **pageIdx** (integer) _(optional)_: Page number to return (0-based). When omitted, returns the first page.
- **pageSize** (integer) _(optional)_: Maximum number of messages to return. When omitted, returns all requests.
- **types** (array) _(optional)_: Filter messages to only return messages of the specified resource types. When omitted or empty, returns all messages.

---

### `list_frames`

**Description:** Lists all frames (including iframes) in the current page as a tree. Shows frame index, name, and URL. Use [`select_frame`](#select_frame) to switch execution context to a specific frame.

**Parameters:** None

---

### `select_frame`

**Description:** Selects a frame (by index from [`list_frames`](#list_frames)) as the execution context for [`evaluate_script`](#evaluate_script), hook_function, inspect_object, and other tools that run JavaScript in the page.

**Parameters:**

- **frameIdx** (integer) **(required)**: The frame index (from [`list_frames`](#list_frames)). 0 = main frame.

---

### `take_screenshot`

**Description:** Take a screenshot of the page or element.

**Parameters:**

- **filePath** (string) _(optional)_: The absolute path, or a path relative to the current working directory, to save the screenshot to instead of attaching it to the response.
- **format** (enum: "png", "jpeg") _(optional)_: Type of format to save the screenshot as. Default is "png"
- **fullPage** (boolean) _(optional)_: If set to true takes a screenshot of the full page instead of the currently visible viewport. Incompatible with uid.
- **quality** (number) _(optional)_: Compression quality for JPEG format (0-100). Higher values mean better quality but larger file sizes. Ignored for PNG format.

---

## JS Reverse Engineering

### `break_on_xhr`

**Description:** Sets a breakpoint that triggers when an XHR/Fetch request URL contains the specified string.

**Parameters:**

- **url** (string) **(required)**: URL pattern to break on (partial match).

---

### `get_paused_info`

**Description:** Gets information about the current paused state including call stack, current location, and scope variables. Use this after a breakpoint is hit to understand the execution context.

**Parameters:**

- **includeScopes** (boolean) _(optional)_: Whether to include scope variables (default: true).
- **maxScopeDepth** (integer) _(optional)_: Maximum scope depth to traverse (default: 2).

---

### `get_request_initiator`

**Description:** Gets the JavaScript call stack that initiated a network request. This helps trace which code triggered an API call.

**Parameters:**

- **requestId** (integer) **(required)**: The request ID (from [`list_network_requests`](#list_network_requests)) to get the initiator for.

---

### `get_script_source`

**Description:** Gets the source code of a JavaScript script by URL (recommended) or script ID. Supports line range (for normal files) or character offset (for minified single-line files). Prefer using url over scriptId — URLs remain stable across page navigations while script IDs become invalid after reload.

**Parameters:**

- **endLine** (integer) _(optional)_: End line number (1-based). Use for multi-line files.
- **length** (integer) _(optional)_: Number of characters to return when using offset (default: 1000).
- **offset** (integer) _(optional)_: Character offset to start from (0-based). Use for minified single-line files.
- **scriptId** (string) _(optional)_: Script ID (from [`list_scripts`](#list_scripts)). Becomes invalid after page navigation — prefer url instead.
- **startLine** (integer) _(optional)_: Start line number (1-based). Use for multi-line files.
- **url** (string) _(optional)_: Script URL (preferred). Stable across page navigations. Exact match first, then substring match.

---

### `inject_before_load`

**Description:** Injects a JavaScript script that runs before any page script on every page load (including refreshes and navigations). Persists until removed. Uses CDP Page.addScriptToEvaluateOnNewDocument.

**Parameters:**

- **script** (string) **(required)**: JavaScript code to inject. Runs before any page script. Example: Object.defineProperty(window, "h5sign", { set(v) { debugger; this.\_h5sign = v; }, get() { return this.\_h5sign; } })

---

### `list_breakpoints`

**Description:** Lists all active breakpoints in the current debugging session. Breakpoints persist across page navigations and are automatically restored after reload/goto/back/forward.

**Parameters:** None

---

### `list_scripts`

**Description:** Lists all JavaScript scripts loaded in the current page. Returns script ID, URL, and source map information. Use this to find scripts before setting breakpoints or searching. Script IDs are automatically refreshed after page navigation, so listed IDs are always valid.

**Parameters:**

- **filter** (string) _(optional)_: Optional filter string to match against script URLs (case-insensitive partial match).

---

### `pause`

**Description:** Pauses JavaScript execution at the current point. Use this to interrupt running code.

**Parameters:** None

---

### `remove_all_breakpoints`

**Description:** Removes all active breakpoints. Use this to clean up debugging state.

**Parameters:** None

---

### `remove_breakpoint`

**Description:** Removes a breakpoint by its ID. Use [`list_breakpoints`](#list_breakpoints) to see active breakpoints.

**Parameters:**

- **breakpointId** (string) **(required)**: The breakpoint ID to remove (from [`list_breakpoints`](#list_breakpoints) or [`set_breakpoint_on_text`](#set_breakpoint_on_text)).

---

### `remove_injected_script`

**Description:** Removes a script previously injected with [`inject_before_load`](#inject_before_load).

**Parameters:**

- **identifier** (string) **(required)**: The identifier returned by [`inject_before_load`](#inject_before_load).

---

### `remove_xhr_breakpoint`

**Description:** Removes an XHR/Fetch breakpoint.

**Parameters:**

- **url** (string) **(required)**: The URL pattern to remove breakpoint for.

---

### `resume`

**Description:** Resumes JavaScript execution after being paused at a breakpoint. Execution continues until the next breakpoint or completion.

**Parameters:** None

---

### `search_in_sources`

**Description:** Searches for a string or regex pattern in all loaded JavaScript sources. Returns matching lines with script ID, URL, and line number. Use [`get_script_source`](#get_script_source) with startLine/endLine to view full context around matches.

**Parameters:**

- **caseSensitive** (boolean) _(optional)_: Whether the search should be case-sensitive.
- **excludeMinified** (boolean) _(optional)_: Skip minified files (files with very long lines). Default: true.
- **isRegex** (boolean) _(optional)_: Whether to treat the query as a regular expression.
- **maxLineLength** (integer) _(optional)_: Maximum characters per matched line preview (default: 150). Increase if you need more context around the match.
- **maxResults** (integer) _(optional)_: Maximum number of results to return (default: 30).
- **query** (string) **(required)**: The search query (string or regex pattern).
- **urlFilter** (string) _(optional)_: Only search scripts whose URL contains this string (case-insensitive).

---

### `set_breakpoint_on_text`

**Description:** Sets a breakpoint on specific code (function name, statement, etc.) by searching for it and automatically determining the exact position. Works with both normal and minified files. Breakpoints persist across page navigations.

**Parameters:**

- **condition** (string) _(optional)_: Optional condition expression. Breakpoint only triggers when this evaluates to true.
- **occurrence** (integer) _(optional)_: Which occurrence to break on (1 = first, 2 = second, etc.).
- **text** (string) **(required)**: The code text to find and set breakpoint on (e.g., "function myFunc", "fetchData(", "apiCall").
- **urlFilter** (string) _(optional)_: Only search in scripts whose URL contains this string (case-insensitive).

---

### `step_into`

**Description:** Steps into the next function call. Use this to enter and debug function bodies.

**Parameters:** None

---

### `step_out`

**Description:** Steps out of the current function, continuing until the function returns. Use this to quickly exit a function.

**Parameters:** None

---

### `step_over`

**Description:** Steps over to the next statement, treating function calls as a single step. Use this to move through code without entering function bodies.

**Parameters:** None

---

### `trace_function`

**Description:** Traces calls to a function by its name in the source code. Works for ANY function including module-internal functions (webpack/rollup bundled). Uses "logpoints" (conditional breakpoints) to log arguments without pausing execution. Trace breakpoints persist across page navigations.

**Parameters:**

- **functionName** (string) **(required)**: The function name to trace. Will search for "function NAME" or "NAME = function" or "NAME(" patterns.
- **logArgs** (boolean) _(optional)_: Whether to log function arguments (default: true).
- **logThis** (boolean) _(optional)_: Whether to log "this" context (default: false).
- **pause** (boolean) _(optional)_: Whether to actually [`pause`](#pause) execution (default: false, just logs).
- **traceId** (string) _(optional)_: Custom ID for this trace. Used to identify in logs.
- **urlFilter** (string) _(optional)_: Only search in scripts matching this URL pattern.

---
