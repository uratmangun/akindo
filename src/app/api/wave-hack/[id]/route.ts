import { NextRequest, NextResponse } from 'next/server';
import ky from 'ky';

interface WaveHackDetailResponse {
  id: string;
  title: string;
  description: string;
  community: {
    websiteUrl?: string;
    discordUrl?: string;
    twitterUrl?: string;
    telegramUrl?: string;
  };
  criteria: Array<{
    id: string;
    title: string;
    sort: number;
    isActive: boolean;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Wave hack ID is required'
      }, { status: 400 });
    }
    
    // Create ky instance with retry logic
    const api = ky.create({
      timeout: 30000,
      retry: { 
        limit: 3, 
        methods: ['get'], 
        statusCodes: [408, 413, 429, 500, 502, 503, 504] 
      }
    });
    
    // Fetch wave hack details from Akindo API
    const waveHackUrl = `https://api.akindo.io/public/wave-hacks/${id}`;
    
    console.log(`Fetching wave hack details for ID: ${id}`);
    console.log(`URL: ${waveHackUrl}`);
    
    const response = await api.get(waveHackUrl).json<WaveHackDetailResponse>();
    
    console.log('API response received:', {
      id: response.id,
      title: response.title,
      hasDescription: !!response.description,
      hasCommunity: !!response.community,
      criteriaCount: response.criteria?.length || 0
    });
    
    const result = {
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(result, {
      headers: {
        // Vercel Edge Cache: cache for 1 day, revalidate every hour
        'Cache-Control': 'public, s-maxage=86400, max-age=3600, stale-while-revalidate=86400',
        // CDN Cache Tags for purging specific wave hacks if needed
        'Cache-Tag': `wave-hack-${id}`,
        // Vary header for different request parameters
        'Vary': 'Accept-Encoding'
      }
    });
    
  } catch (error) {
    console.error('Error fetching wave hack details:', error);
    
    // Handle different types of errors
    let errorMessage = 'Unknown error occurred';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check if it's a network/HTTP error
      if (error.message.includes('404')) {
        errorMessage = 'Wave hack not found';
        statusCode = 404;
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout - the API is taking too long to respond';
        statusCode = 504;
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error - unable to reach the API';
        statusCode = 503;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      debug: {
        originalError: error instanceof Error ? error.message : 'Unknown error',
        waveHackId: params.id
      }
    }, { status: statusCode });
  }
}
