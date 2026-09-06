import "server-only";

type ReadResult = { error: { message: string } | null };

export async function retryRead<T extends ReadResult>(
  read: () => PromiseLike<T>,
  message: string,
): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await read();
      if (result.error) throw result.error;
      return result;
    } catch (error) {
      if (attempt === 1) throw new Error(message, { cause: error });
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error(message);
}
