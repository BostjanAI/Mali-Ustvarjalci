import { NextResponse } from 'next/server';
// Retired development stub. A failed payment must never become a confirmed order.
export async function POST(){return NextResponse.json({error:'Use the payment checkout endpoint. No order has been created.'},{status:410});}
