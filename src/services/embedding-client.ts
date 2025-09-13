'use server';

import {
  PredictionServiceClient,
} from '@google-cloud/aiplatform';

const clientOptions = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
};
const predictionServiceClient = new PredictionServiceClient(clientOptions);

export async function getEmbedding(
  text: string
): Promise<number[] | null | undefined> {
  try {
    const [response] = await predictionServiceClient.predict({
      endpoint:
        'projects/studio-api-project-10002/locations/us-central1/publishers/google/models/text-embedding-004',
      instances: [{ content: text }],
    });

    const prediction = response.predictions?.[0]?.structValue?.fields?.embeddings?.structValue?.fields?.values?.listValue?.values;
    if (prediction) {
      return prediction.map(v => v.numberValue!);
    }
    return null;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}
