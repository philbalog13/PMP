import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'tpe-web',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
