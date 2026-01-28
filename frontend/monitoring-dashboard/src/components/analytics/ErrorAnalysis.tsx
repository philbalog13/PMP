/**
 * Error Analysis Component
 * Bar chart showing common errors
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface ErrorData {
    error: string;
    count: number;
    workshop: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ErrorAnalysisProps {
    errors: ErrorData[];
}

export default function ErrorAnalysis({ errors }: ErrorAnalysisProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    const severityColors: Record<string, string> = {
        low: '#22c55e',
        medium: '#f59e0b',
        high: '#ef4444',
        critical: '#dc2626'
    };

    useEffect(() => {
        if (!svgRef.current || errors.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = svgRef.current.clientWidth || 600;
        const height = 300;
        const margin = { top: 20, right: 30, bottom: 100, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Sort by count
        const sortedErrors = [...errors].sort((a, b) => b.count - a.count);

        // Scales
        const xScale = d3.scaleBand()
            .domain(sortedErrors.map(d => d.error))
            .range([0, innerWidth])
            .padding(0.3);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(sortedErrors, d => d.count) || 50])
            .nice()
            .range([innerHeight, 0]);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Grid lines
        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(() => ''))
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line')
                .attr('stroke', 'var(--border-color)')
                .attr('stroke-opacity', 0.3)
                .attr('stroke-dasharray', '3,3'));

        // Y axis
        g.append('g')
            .call(d3.axisLeft(yScale).ticks(5))
            .call(g => g.select('.domain').attr('stroke', 'var(--border-color)'))
            .call(g => g.selectAll('.tick text')
                .attr('fill', 'var(--text-secondary)')
                .attr('font-size', '11px'));

        // Bars
        g.selectAll('.bar')
            .data(sortedErrors)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.error) || 0)
            .attr('y', innerHeight)
            .attr('width', xScale.bandwidth())
            .attr('height', 0)
            .attr('fill', d => severityColors[d.severity])
            .attr('rx', 4)
            .transition()
            .duration(800)
            .delay((_, i) => i * 50)
            .attr('y', d => yScale(d.count))
            .attr('height', d => innerHeight - yScale(d.count));

        // Value labels
        g.selectAll('.value-label')
            .data(sortedErrors)
            .enter()
            .append('text')
            .attr('class', 'value-label')
            .attr('x', d => (xScale(d.error) || 0) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.count) - 8)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-primary)')
            .attr('font-size', '12px')
            .attr('font-weight', 600)
            .text(d => d.count);

        // X axis labels (rotated)
        g.selectAll('.x-label')
            .data(sortedErrors)
            .enter()
            .append('text')
            .attr('class', 'x-label')
            .attr('x', d => (xScale(d.error) || 0) + xScale.bandwidth() / 2)
            .attr('y', innerHeight + 15)
            .attr('text-anchor', 'start')
            .attr('transform', d => `rotate(45, ${(xScale(d.error) || 0) + xScale.bandwidth() / 2}, ${innerHeight + 15})`)
            .attr('fill', 'var(--text-secondary)')
            .attr('font-size', '10px')
            .text(d => d.error.length > 20 ? d.error.substring(0, 20) + '...' : d.error);

    }, [errors]);

    return (
        <div>
            {/* Legend */}
            <div style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '16px',
                flexWrap: 'wrap'
            }}>
                {Object.entries(severityColors).map(([severity, color]) => (
                    <div key={severity} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px'
                    }}>
                        <span style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '3px',
                            background: color
                        }} />
                        <span style={{
                            color: 'var(--text-secondary)',
                            textTransform: 'capitalize'
                        }}>
                            {severity}
                        </span>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="chart-container">
                <svg
                    ref={svgRef}
                    width="100%"
                    height="300"
                    style={{ overflow: 'visible' }}
                />
            </div>

            {/* Details Table */}
            <div style={{ marginTop: '24px' }}>
                <h4 style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
                    Détails
                </h4>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Erreur</th>
                            <th>Atelier</th>
                            <th>Occurrences</th>
                            <th>Sévérité</th>
                        </tr>
                    </thead>
                    <tbody>
                        {errors.slice(0, 5).map((error, i) => (
                            <tr key={i}>
                                <td>{error.error}</td>
                                <td>{error.workshop}</td>
                                <td>{error.count}</td>
                                <td>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: `${severityColors[error.severity]}20`,
                                        color: severityColors[error.severity],
                                        textTransform: 'uppercase'
                                    }}>
                                        {error.severity}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
