import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone

# 1. Load the environment variables from the .env file first
load_dotenv()

# 2. Get the variables and store them
gemini_api_key = os.getenv("GEMINI_API_KEY")
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pinecone_environment = os.getenv("PINECONE_ENVIRONMENT")
pinecone_index_name = os.getenv("PINECONE_INDEX_NAME")

# ----------------- Debugging step to confirm variables are loaded -----------------
print(f"Loaded PINECONE_API_KEY: {'[Found]' if pinecone_api_key else '[Not Found]'}")
print(f"Loaded PINECONE_ENVIRONMENT: {pinecone_environment}")
print(f"Loaded PINECONE_INDEX_NAME: {pinecone_index_name}")
# ----------------------------------------------------------------------------------

# 3. Initialize clients here, so they are ready for use
pinecone_client = None
if pinecone_api_key and pinecone_environment:
    try:
        pinecone_client = Pinecone(api_key=pinecone_api_key, environment=pinecone_environment)
        print("Pinecone client initialized successfully!")
    except Exception as e:
        print(f"Error initializing Pinecone client: {e}")
else:
    print("Error: PINECONE_API_KEY or PINECONE_ENVIRONMENT not found in environment variables.")

# ---------------------------- Now, define your functions to load the data
def index_document():
    if not all([gemini_api_key, pinecone_client, pinecone_index_name]):
        print("Error: Required environment variables or clients are not configured correctly.")
        return

    # Path to the PDF
    pdf_path = "./dsa.pdf"
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return

    # Create a PDF loader instance
    loader = PyPDFLoader(pdf_path)
    
    # Load the PDF documents
    raw_docs = loader.load()
    print("PDF Loaded Successfully")
    
    #----------------------------------perfrom the chunking step.
    CHUNK_SIZE = 1000
    CHUNK_OVERLAP = 200

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )

    chunked_docs = text_splitter.split_documents(raw_docs) 
    print("Chunking Completed Successfully")

    #---------------------------------- Vector Embedding
    embeddings = GoogleGenerativeAIEmbeddings(
        google_api_key=gemini_api_key,
        model="text-embedding-004",
    )
    print("Embeddings Model Configured Successfully")

    # ---------------------------------configuration of database.
    try:
        # We don't need to manually create the Pinecone Index object for this
        # LangChain's PineconeVectorStore handles this internally.
        # Ensure the index name is correct and the index exists in your project.

        # The from_documents method will now correctly use the index name directly.
        vectorstore = PineconeVectorStore.from_documents(
            documents=chunked_docs,
            embedding=embeddings,
            index_name=pinecone_index_name,  # Pass the index name string directly
            namespace="amanansari-namespace", # (Optional) If you use a namespace, specify it here
        )
        print("Data Loaded Successfully into Pinecone Vectorstore")

    except Exception as e:
        print(f"An error occurred while loading data into Pinecone: {e}")

# 5. Call the function
if __name__ == "__main__":
    index_document()