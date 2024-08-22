import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialize OpenAI and Pinecone
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY as string,
});

const pinecone = new Pinecone({
  apiKey: process.env.NEXT_PUBLIC_PINECONE_API_KEY as string,
});
const index = pinecone.index('rag').namespace('ns1');

// Function to get embeddings from OpenAI
async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002', // Use an appropriate model
      input: text,
    });
    return response.data[0]?.embedding || [];
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the web page
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Extract relevant data from the Rate My Professors page
    // Note: These selectors are generalized and might need adjustments
    const name = $('h1[data-testid="profName"]').text().trim() || $('div#header > div.professor-name').text().trim();
    const review = $('div[data-testid="review-text"]').text().trim() || $('div#reviews > div.review').text().trim();
    const subject = $('span[data-testid="subject"]').text().trim() || $('div#header > div.subject').text().trim();
    const stars = $('span[data-testid="rating"]').text().trim() || $('div#header > div.rating').text().trim();

    if (!name || !review || !subject || !stars) {
      return NextResponse.json({ error: 'Failed to extract data from the page' }, { status: 400 });
    }

    // Generate embedding for the extracted text
    const embedding = await getEmbedding(name + ' ' + review);

    if (embedding.length === 0) {
      return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
    }

    // Insert data into Pinecone
    await index.upsert([
      {
        id: `${name}-${Date.now()}`, // Ensure unique IDs, use name and timestamp
        values: embedding,
        metadata: {
          review,
          subject,
          stars,
        },
      },
    ]);

    return NextResponse.json({ success: 'Data inserted successfully' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
