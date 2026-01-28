/**
 * Response Code Statistics Chart
 * D3.js horizontal bar chart showing response code distribution
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface ResponseCodeDistribution {
    [code: string]: {
        count: number;
        color: string;
        label: string;
    };
}

interface ResponseCodeStatsProps {
    distribution: ResponseCodeDistribution;
}

export default function ResponseCodeStats({ distribution }: ResponseCodeStatsProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = svgRef.current.clientWidth || 400;
        const height = 250;
        const margin = { top: 20, right: 80, bottom: 20, left: 80 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Prepare data
        const data = Object.entries(distribution)
            .filter(([_, v]) => v.count > 0)
            .map(([code, v]) => ({
                code,
                ...v
            }))
            .sort((a, b) => b.count - a.count);

        if (data.length === 0) {
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height / 2)
                .attr('text-anchor', 'middle')
                .attr('fill', 'var(--text-secondary)')
                .text('Aucune donnée');
            return;
        }

        const total = data.reduce((sum, d) => sum + d.count, 0);

        // Scales
        const xScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count) || 1])
            .range([0, innerWidth]);

        const yScale = d3.scaleBand()
            .domain(data.map(d => d.code))
            .range([0, innerHeight])
            .padding(0.3);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Bars
        g.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => yScale(d.code) || 0)
            .attr('width', 0)
            .attr('height', yScale.bandwidth())
            .attr('fill', d => d.color)
            .attr('rx', 4)
            .attr('opacity', 0.8)
            .transition()
            .duration(800)
            .attr('width', d => xScale(d.count));

        // Labels (left - code)
        g.selectAll('.label-code')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'label-code')
            .attr('x', -10)
            .attr('y', d => (yScale(d.code) || 0) + yScale.bandwidth() / 2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'var(--text-primary)')
            .attr('font-weight', 600)
            .attr('font-size', '14px')
            .text(d => d.code);

        // Labels (right - count and percentage)
        g.selectAll('.label-count')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'label-count')
            .attr('x', d => xScale(d.count) + 10)
            .attr('y', d => (yScale(d.code) || 0) + yScale.bandwidth() / 2)
            .attr('dominant-baseline', 'middle')
            .attr('fill', 'var(--text-secondary)')
            .attr('font-size', '12px')
            .text(d => `${d.count} (${((d.count / total) * 100).toFixed(1)}%)`);

    }, [distribution]);

    return (
        <div className="chart-container">
            <svg
                ref={svgRef}
                width="100%"
                height="250"
                style={{ overflow: 'visible' }}
            />
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                marginTop: '16px',
                justifyContent: 'center'
            }}>
                {Object.entries(distribution)
                    .filter(([_, v]) => v.count > 0)
                    .slice(0, 4)
                    .map(([code, v]) => (
                        <div key={code} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px'
                        }}>
                            <span style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '3px',
                                background: v.color
                            }} />
                            <span style={{ color: 'var(--text-secondary)' }}>
                                {code}: {v.label}
                            </span>
                        </div>
                    ))}
            </div>
        </div>
    );
}
