import { useState, useRef, useEffect } from "react";

import "./App.css";

/* ---------- Helper: Parse scheduler timeline ---------- */
function parseTimeline(text) {
  if (!text) return null;

  const lines = text.split("\n");
  const timeline = {};

  lines.forEach((line) => {
    // Only process lines that look like: A |*|.|*|
    if (!line.includes("|")) return;

    const parts = line.split("|");
    if (parts.length < 3) return;

    const processName = parts[0].trim();
    const cells = parts.slice(1, -1); // remove last empty part

    // Ignore header rows like time axis
    if (processName.length === 0 || processName.length > 2) return;

    timeline[processName] = cells;
  });

  return timeline;
}

function App() {
  const [algorithm, setAlgorithm] = useState("1");
  const [processText, setProcessText] = useState("");
  const [timeline, setTimeline] = useState(null);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);

  /* ---------- Run Scheduler ---------- */
  const runScheduler = async () => {
    setError("");
    setTimeline(null);
    setCurrentTime(0);
    setIsPlaying(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!processText.trim()) {
      setError("Please enter at least one process.");
      return;
    }

    const processes = processText.trim().split("\n");

    const input = `trace
${algorithm}
41
${processes.length}
${processes.join("\n")}
`;

    try {
      const res = await fetch("http://localhost:3001/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });

      const data = await res.json();
      if (!data.output) {
        setError("No output received from backend.");
        return;
      }

      const parsed = parseTimeline(data.output);
      setTimeline(parsed);
    } catch (err) {
      setError("Failed to connect to backend.");
    }
  };

  const lastActiveTime = timeline
    ? Math.max(
        ...Object.values(timeline).map((cells) =>
          Math.max(cells.lastIndexOf("*"), 0),
        ),
      ) + 1
    : 0;

  const restartAnimation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentTime(0);
    setIsPlaying(false);
  };

  useEffect(() => {
    if (!timeline || !isPlaying) return;

    intervalRef.current = setInterval(() => {
      setCurrentTime((t) => {
        if (t >= lastActiveTime) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsPlaying(false);
          return t;
        }
        return t + 1;
      });
    }, 300);

    return () => clearInterval(intervalRef.current);
  }, [timeline, isPlaying, lastActiveTime]);

  return (
    <div className="app">
      <div className="card">
        <h1>CPU Scheduling Simulator</h1>

        <div className="controls">
          <div className="control">
            <label>Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
            >
              <option value="1">FCFS</option>
              <option value="2">Round Robin</option>
              <option value="3">SPN</option>
              <option value="4">SRT</option>
              <option value="5">HRRN</option>
              <option value="6">FB-1</option>
              <option value="7">FB-2i</option>
              <option value="8">AGING</option>
            </select>
          </div>

          <div className="control">
            <label>Processes</label>
            <textarea
              placeholder={`A,0,3
B,2,6
C,4,4`}
              value={processText}
              onChange={(e) => setProcessText(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
          <button className="run-btn" onClick={runScheduler}>
            ⚙ Generate Timeline
          </button>

          <button
            className="run-btn"
            onClick={() => setIsPlaying(true)}
            disabled={!timeline || isPlaying}
          >
            ▶ Play
          </button>

          <button
            className="run-btn"
            onClick={() => setIsPlaying(false)}
            disabled={!isPlaying}
          >
            ⏸ Pause
          </button>

          <button
            className="run-btn"
            onClick={restartAnimation}
            disabled={!timeline}
          >
            ↺ Restart
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {timeline && currentTime > 0 && (
          <div className="gantt">
            <div className="legend-row">
              <div className="process-label"></div>

              <div className="legend">
                <div className="legend-item">
                  <span className="cell run"></span>
                  Running
                </div>
                <div className="legend-item">
                  <span className="cell wait"></span>
                  Waiting
                </div>
                <div className="legend-item">
                  <span className="cell idle"></span>
                  Idle
                </div>
              </div>
            </div>

            {/* TIME AXIS ROW */}
            <div className="gantt-row">
              <div className="process-label time-label">Time →</div>

              <div className="cells">
                {Array.from({ length: currentTime }).map((_, i) => (
                  <div key={i} className="time-cell">
                    {i}
                  </div>
                ))}
              </div>
            </div>

            {/* PROCESS ROWS */}
            {Object.entries(timeline).map(([process, cells]) => (
              <div key={process} className="gantt-row">
                <div className="process-label">{process}</div>

                <div className="cells">
                  {cells.slice(0, currentTime).map((c, i) => (
                    <div
                      key={i}
                      className={`cell ${
                        c === "*" ? "run" : c === "." ? "wait" : "idle"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
