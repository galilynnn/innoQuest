import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request) {
  try {
    const { productId, name } = await request.json()

    if (!productId || !name) {
      return NextResponse.json(
        { error: 'Product ID and name are required' },
        { status: 400 }
      )
    }

    if (!name.trim()) {
      return NextResponse.json(
        { error: 'Product name cannot be empty' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Update the product name
    const { data, error } = await supabase
      .from('products')
      .update({ name: name.trim() })
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('Database error updating product:', error)
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      product: data
    })
  } catch (error) {
    console.error('Error in update-product API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
