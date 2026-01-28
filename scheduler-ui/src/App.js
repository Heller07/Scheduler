import { useState } from "react";
import "./App.css";

/* ---------- Helper: Parse scheduler timeline ---------- */
function parseTimeline(text) {
  if (!text) return null;

  const lines = text.split("\n");
  const timeline = {};

  lines.forEach(line => {
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

  /* ---------- Run Scheduler ---------- */
  const runScheduler = async () => {
    setError("");
    setTimeline(null);

    if (!processText.trim()) {
      setError("Please enter at least one process.");
      return;
    }

    const processes = processText.trim().split("\n");

    const input = `trace
${algorithm}
20
${processes.length}
${processes.join("\n")}
`;

    try {
      const res = await fetch("http://localhost:3001/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input })
      });

      const data = await res.json();
      console.log("Backend response:", data);

      if (!data.output) {
        setError("No output received from backend.");
        return;
      }

      const parsed = parseTimeline(data.output);
      setTimeline(parsed);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to backend.");
    }
  };

  return (
  <div className="app">
    <div className="card">
      <h1>CPU Scheduling Simulator</h1>

      <div className="controls">
        <div className="control">
          <label>Algorithm</label>
          <select value={algorithm} onChange={e => setAlgorithm(e.target.value)}>
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
            onChange={e => setProcessText(e.target.value)}
          />
        </div>
      </div>

      <button className="run-btn" onClick={runScheduler}>
        ▶ Run Simulation
      </button>

      {error && <div className="error">{error}</div>}

      {timeline && (
        <div className="gantt">
          <h2>Gantt Chart</h2>

          {Object.entries(timeline).map(([process, cells]) => (
            <div key={process} className="gantt-row">
              <div className="process-label">{process}</div>

              <div className="cells">
                {cells.map((c, i) => (
                  <div
                    key={i}
                    className={`cell ${
                      c === "*" ? "run" : c === "." ? "wait" : "idle"
                    }`}
                    title={`t=${i}`}
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
