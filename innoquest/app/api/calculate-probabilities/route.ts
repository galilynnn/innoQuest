import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { game_id, team_id, product_id, price } = body
    
    // Validate inputs
    if (!game_id || !team_id || !product_id || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: game_id, team_id, product_id, price' },
        { status: 400 }
      )
    }
    
    if (price < 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      )
    }
    
    console.log('Calculating purchase probabilities:', { game_id, team_id, product_id, price })
    
    // Check if customer_purchase_probabilities table exists and customer dataset is active
    const { data: datasetCheck, error: datasetError } = await supabase
      .from('customer_data_sets')
      .select('id, file_name')
      .eq('game_id', game_id)
      .eq('is_active', true)
      .maybeSingle()
    
    if (datasetError) {
      console.error('Error checking customer dataset:', datasetError)
      return NextResponse.json(
        { error: 'Failed to check customer dataset', details: datasetError.message },
        { status: 500 }
      )
    }
    
    if (!datasetCheck) {
      console.warn('No active customer dataset found for game:', game_id)
      return NextResponse.json(
        { error: 'No active customer dataset', details: 'Please upload and activate a customer dataset in the admin panel first.' },
        { status: 400 }
      )
    }
    
    console.log('Using customer dataset:', datasetCheck.file_name)
    
    // Call the PostgreSQL function to calculate probabilities
    const { data, error } = await supabase.rpc('calculate_purchase_probabilities', {
      p_game_id: game_id,
      p_team_id: team_id,
      p_product_id: product_id,
      p_price: price
    })
    
    if (error) {
      console.error('Error calculating probabilities:', error)
      return NextResponse.json(
        { error: 'Failed to calculate purchase probabilities', details: error.message },
        { status: 500 }
      )
    }
    
    // Get the count of calculated probabilities
    const { count, error: countError } = await supabase
      .from('customer_purchase_probabilities')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game_id)
      .eq('team_id', team_id)
      .eq('product_id', product_id)
    
    if (countError) {
      console.error('Error getting count:', countError)
    }
    
    console.log('Successfully calculated probabilities for', count, 'customers')
    
    return NextResponse.json({
      success: true,
      message: `Successfully calculated purchase probabilities for ${count || 0} customers`,
      count: count || 0
    })
    
  } catch (error: any) {
    console.error('Exception in calculate-probabilities:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
