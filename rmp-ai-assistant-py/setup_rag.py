from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
import os
import json

load_dotenv(dotenv_path='/home/pengu/rmp-ai/.env.local')
# Load API Keys
pinecone_api_key = os.getenv("NEXT_PUBLIC_PINECONE_API_KEY")
openai_api_key = os.getenv("NEXT_PUBLIC_OPENAI_API_KEY")

# Initialize Pinecone
pc = Pinecone(api_key=pinecone_api_key)

# Create a Pinecone index
pc.create_index(
    name="rag",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
)

# Load the review data
data = json.load(open("reviews.json"))

processed_data = []
client = OpenAI(api_key=openai_api_key)  # Pass API key here

# Create embeddings for each review
for review in data["reviews"]:
    response = client.embeddings.create(
        input=review['review'], model="text-embedding-3-small"
    )
    embedding = response.data[0].embedding
    processed_data.append(
        {
            "values": embedding,
            "id": review["professor"],
            "metadata":{
                "review": review["review"],
                "subject": review["subject"],
                "stars": review["stars"],
            }
        }
    )

# Insert the embeddings into the Pinecone index
index = pc.Index("rag")
upsert_response = index.upsert(
    vectors=processed_data,
    namespace="ns1",
)
print(f"Upserted count: {upsert_response['upserted_count']}")

# Print index statistics
print(index.describe_index_stats())
