/**
 * Service Latency Chart
 * Bar chart showing latency per service
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface ServiceStatus {
    status: string;
    latency: number;
}

interface ServiceLatencyProps {
    services?: Record<string, ServiceStatus>;
}

export default function ServiceLatency({ services }: ServiceLatencyProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const width = svgRef.current.clientWidth || 400;
        const height = 200;
        const margin = { top: 30, right: 20, bottom: 50, left: 50 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Default data if no services
        const defaultServices: Record<string, ServiceStatus> = {
            'Auth Engine': { status: 'up', latency: 85 },
            'HSM': { status: 'up', latency: 35 },
            'Switch': { status: 'up', latency: 45 },
            'Gateway': { status: 'up', latency: 15 },
            'Database': { status: 'up', latency: 8 }
        };

        const serviceData = services
            ? Object.entries(services).map(([name, data]) => ({
                name: name.replace('-', ' ').split(' ')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                latency: data.latency,
                status: data.status
            }))
            : Object.entries(defaultServices).map(([name, data]) => ({
                name,
                latency: data.latency,
                status: data.status
            }));

        // Scales
        const xScale = d3.scaleBand()
            .domain(serviceData.map(d => d.name))
            .range([0, innerWidth])
            .padding(0.3);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(serviceData, d => d.latency) || 100])
            .nice()
            .range([innerHeight, 0]);

        // Color scale based on latency
        const colorScale = (latency: number) => {
            if (latency < 50) return '#22c55e';
            if (latency < 100) return '#f59e0b';
            return '#ef4444';
        };

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Y axis
        g.append('g')
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}ms`))
            .call(g => g.select('.domain').attr('stroke', 'var(--border-color)'))
            .call(g => g.selectAll('.tick line').attr('stroke', 'var(--border-color)'))
            .call(g => g.selectAll('.tick text').attr('fill', 'var(--text-secondary)').attr('font-size', '11px'));

        // Grid lines
        g.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickFormat(() => ''))
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line')
                .attr('stroke', 'var(--border-color)')
                .attr('stroke-opacity', 0.3)
                .attr('stroke-dasharray', '3,3'));

        // Bars
        g.selectAll('.bar')
            .data(serviceData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.name) || 0)
            .attr('y', innerHeight)
            .attr('width', xScale.bandwidth())
            .attr('height', 0)
            .attr('fill', d => colorScale(d.latency))
            .attr('rx', 4)
            .transition()
            .duration(800)
            .attr('y', d => yScale(d.latency))
            .attr('height', d => innerHeight - yScale(d.latency));

        // Value labels on top of bars
        g.selectAll('.value-label')
            .data(serviceData)
            .enter()
            .append('text')
            .attr('class', 'value-label')
            .attr('x', d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.latency) - 8)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-primary)')
            .attr('font-size', '12px')
            .attr('font-weight', 600)
            .text(d => `${d.latency}ms`);

        // X axis labels
        g.selectAll('.x-label')
            .data(serviceData)
            .enter()
            .append('text')
            .attr('class', 'x-label')
            .attr('x', d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
            .attr('y', innerHeight + 25)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-secondary)')
            .attr('font-size', '11px')
            .text(d => d.name);

        // Status indicators
        g.selectAll('.status-dot')
            .data(serviceData)
            .enter()
            .append('circle')
            .attr('class', 'status-dot')
            .attr('cx', d => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
            .attr('cy', innerHeight + 40)
            .attr('r', 5)
            .attr('fill', d => d.status === 'up' ? '#22c55e' : '#ef4444');

    }, [services]);

    return (
        <div className="chart-container">
            <svg
                ref={svgRef}
                width="100%"
                height="200"
                style={{ overflow: 'visible' }}
            />
        </div>
    );
}
