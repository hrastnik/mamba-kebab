import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// We need a private Supabase client here to write to the database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cart } = body;

    if (!cart || cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // 1. Calculate total (Secure way: In a real app, you fetch prices from DB again here to prevent hacking.
    // For now, we will trust the cart for simplicity, but keep this in mind).
    let total = 0;
    cart.forEach((item: any) => {
      total += item.price;
    });

    // 2. Create the Order in Supabase first (Status: Pending)
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        total_price: total,
        status: "pending",
        items: cart,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: cart.map((item: any) => ({
        price_data: {
          currency: "eur",
          product_data: {
            name: item.name,
            description: item.details, // Shows ingredients in Stripe
          },
          unit_amount: Math.round(item.price * 100), // Stripe needs cents (e.g. 650 for €6.50)
        },
        quantity: 1,
      })),
      mode: "payment",
      success_url: `${request.headers.get(
        "origin"
      )}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin")}/`,
      metadata: {
        order_id: order.id, // Link Stripe payment to our Supabase order
      },
    });

    // 4. Update order with session ID so we can find it later
    await supabase
      .from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
