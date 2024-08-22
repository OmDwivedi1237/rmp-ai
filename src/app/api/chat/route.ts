import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const systemPrompt = `
You are a rate my professor agent to help students find classes, that takes in user questions and answers them.
For every user question, the top 3 professors that match the user question are returned.
Use them to answer the question if needed.
`;

// Create the POST function
export async function POST(req: Request) {
  try {
    const data = await req.json();  // Use req.json() to parse JSON body

    // Initialize Pinecone and OpenAI
    const pineconeApiKey = process.env.NEXT_PUBLIC_PINECONE_API_KEY as string;
    const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY as string;

    const pc = new Pinecone({
      apiKey: pineconeApiKey,
    });
    const index = pc.index('rag').namespace('ns1');
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Process the user’s query
    const text = data[data.length - 1].content;
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    // Query Pinecone
    const results = await index.query({
      topK: 5,
      includeMetadata: true,
      vector: embedding.data[0].embedding,
    });

    // Format the results
    let resultString = '';
    results.matches.forEach((match) => {
      resultString += `
      Returned Results:
      Professor: ${match.id}
      Review: ${match.metadata?.review ?? ''}
      Subject: ${match.metadata?.subject ?? ''}
      Stars: ${match.metadata?.stars ?? ''}
      \n\n`;
    });

    // Prepare the OpenAI request
    const lastMessage = data[data.length - 1];
    const lastMessageContent = lastMessage.content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

    // Send request to OpenAI
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...lastDataWithoutLastMessage,
        { role: 'user', content: lastMessageContent },
      ],
      model: 'gpt-3.5-turbo',
      stream: true,
    });

    // Set up streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error('Error in API route:', error);
    return new NextResponse('Error processing request', { status: 500 });
  }
}
