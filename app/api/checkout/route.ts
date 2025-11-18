import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cart, customerName } = body; // Receive name

    if (!cart || cart.length === 0)
      return NextResponse.json({ error: "Empty" }, { status: 400 });

    let total = 0;
    cart.forEach((item: any) => {
      total += item.price;
    });

    // Create Order with new columns
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        total_price: total,
        order_status: "new", // Workflow status
        payment_status: "unpaid", // Payment status
        customer_name: customerName, // Who is picking it up
        items: cart,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: cart.map((item: any) => ({
        price_data: {
          currency: "eur",
          product_data: {
            name: `${item.name} (${item.itemOwner})`, // Show "Kebab (Ivan)" in Stripe
            description: item.details,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: 1,
      })),
      mode: "payment",
      success_url: `${request.headers.get(
        "origin"
      )}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin")}/`,
      metadata: { order_id: order.id },
    });

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
