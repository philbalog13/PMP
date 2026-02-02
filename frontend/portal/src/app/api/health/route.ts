import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'portal',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
