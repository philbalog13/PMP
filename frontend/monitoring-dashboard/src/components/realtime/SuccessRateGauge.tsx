/**
 * Success Rate Gauge
 * Animated circular gauge showing success rate
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface SuccessRateGaugeProps {
    rate: number;
}

export default function SuccessRateGauge({ rate }: SuccessRateGaugeProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = 200;
        const height = 200;
        const radius = Math.min(width, height) / 2 - 20;
        const thickness = 20;

        const g = svg.append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);

        // Background arc
        const backgroundArc = d3.arc<any>()
            .innerRadius(radius - thickness)
            .outerRadius(radius)
            .startAngle(-Math.PI * 0.75)
            .endAngle(Math.PI * 0.75)
            .cornerRadius(thickness / 2);

        g.append('path')
            .attr('d', backgroundArc({})!)
            .attr('fill', 'var(--bg-tertiary)');

        // Value arc with gradient
        const defs = svg.append('defs');

        const gradient = defs.append('linearGradient')
            .attr('id', 'gauge-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#00d4ff');

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#7c3aed');

        // Calculate end angle based on rate
        const scale = d3.scaleLinear()
            .domain([0, 100])
            .range([-Math.PI * 0.75, Math.PI * 0.75]);

        const valueArc = d3.arc<any>()
            .innerRadius(radius - thickness)
            .outerRadius(radius)
            .startAngle(-Math.PI * 0.75)
            .cornerRadius(thickness / 2);

        const valuePath = g.append('path')
            .datum({ endAngle: -Math.PI * 0.75 })
            .attr('d', (d: any) => valueArc.endAngle(d.endAngle)(d)!)
            .attr('fill', 'url(#gauge-gradient)');

        // Animate the value arc
        valuePath.transition()
            .duration(1000)
            .ease(d3.easeElasticOut)
            .attrTween('d', function (d: any) {
                const interpolate = d3.interpolate(d.endAngle, scale(rate));
                return function (t) {
                    d.endAngle = interpolate(t);
                    return valueArc.endAngle(d.endAngle)(d)!;
                };
            });

        // Center text - percentage
        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('y', -10)
            .attr('fill', 'var(--text-primary)')
            .attr('font-size', '36px')
            .attr('font-weight', 700)
            .text('0%')
            .transition()
            .duration(1000)
            .tween('text', function () {
                const interpolate = d3.interpolate(0, rate);
                return function (t) {
                    d3.select(this).text(`${interpolate(t).toFixed(1)}%`);
                };
            });

        // Label
        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 25)
            .attr('fill', 'var(--text-secondary)')
            .attr('font-size', '14px')
            .text('Taux de Succès');

        // Status text
        const status = rate >= 98 ? 'Excellent' : rate >= 95 ? 'Normal' : rate >= 90 ? 'Attention' : 'Critique';
        const statusColor = rate >= 98 ? '#22c55e' : rate >= 95 ? '#3b82f6' : rate >= 90 ? '#f59e0b' : '#ef4444';

        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', 50)
            .attr('fill', statusColor)
            .attr('font-size', '12px')
            .attr('font-weight', 600)
            .text(status);

        // Tick marks
        const tickData = [0, 25, 50, 75, 100];
        const tickScale = d3.scaleLinear()
            .domain([0, 100])
            .range([-135, 135]);

        tickData.forEach(tick => {
            const angle = tickScale(tick) * (Math.PI / 180);
            const innerX = Math.cos(angle - Math.PI / 2) * (radius - thickness - 8);
            const innerY = Math.sin(angle - Math.PI / 2) * (radius - thickness - 8);
            const outerX = Math.cos(angle - Math.PI / 2) * (radius - thickness - 2);
            const outerY = Math.sin(angle - Math.PI / 2) * (radius - thickness - 2);

            g.append('line')
                .attr('x1', innerX)
                .attr('y1', innerY)
                .attr('x2', outerX)
                .attr('y2', outerY)
                .attr('stroke', 'var(--border-color)')
                .attr('stroke-width', 2);
        });

    }, [rate]);

    return (
        <div className="gauge-container">
            <svg
                ref={svgRef}
                width="200"
                height="200"
                style={{ overflow: 'visible' }}
            />
        </div>
    );
}
