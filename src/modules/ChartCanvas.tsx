import { Chart, registerables, type ChartConfiguration } from "chart.js";
import { useEffect, useRef } from "react";

Chart.register(...registerables);

export default function ChartCanvas({ config }: { config: ChartConfiguration }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        Chart.defaults.color = getComputedStyle(canvas).color;
        Chart.defaults.borderColor = "rgba(128,128,128,0.2)";
        const chart = new Chart(canvas, config);
        return () => chart.destroy();
    }, [config]);

    return (
        <div className="relative h-64 w-full">
            <canvas ref={canvasRef} />
        </div>
    );
}
