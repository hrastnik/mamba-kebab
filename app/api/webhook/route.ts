import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = headers().get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // The user paid! Let's find the order and mark it as 'paid'
    // We stored the order ID in metadata in the checkout route earlier
    const orderId = session.metadata?.order_id;

    if (orderId) {
      console.log(`💰 Payment received for Order ID: ${orderId}`);

      const { error } = await supabase
        .from("orders")
        .update({
          status: "paid",
          customer_details: session.customer_details,
        })
        .eq("id", orderId);

      if (error) console.error("Error updating order:", error);
    }
  }

  return NextResponse.json({ received: true });
}
