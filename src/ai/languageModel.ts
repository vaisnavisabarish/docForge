import * as vscode from 'vscode';

export async function generateWithLanguageModel(
  prompt: string
): Promise<string> {
  let models: vscode.LanguageModelChat[] = [];

  try {
    // Do not require a specific paid provider.
    // If VS Code has any usable language model available,
    // DocForge can attempt to use it.
    models = await vscode.lm.selectChatModels();
  } catch (error) {
    throw new Error(
      `No language model is available to DocForge: ${String(error)}`
    );
  }

  if (models.length === 0) {
    throw new Error(
      'No language model is currently available. AI enhancement will be skipped.'
    );
  }

  const model = models[0];

  console.log(
    `DocForge selected model: ${model.name} (${model.vendor}/${model.family})`
  );

  const messages = [
    vscode.LanguageModelChatMessage.User(prompt)
  ];

  const cancellation =
    new vscode.CancellationTokenSource();

  try {
    const response = await model.sendRequest(
      messages,
      {},
      cancellation.token
    );

    let result = '';
    let fragmentCount = 0;

    try {
      for await (const fragment of response.text) {
        fragmentCount++;
        result += fragment;
      }
    } catch (error) {
      throw new Error(
        `Language model response stream failed: ${String(error)}`
      );
    }

    console.log(
      `DocForge received ${fragmentCount} response fragments from ${model.name}.`
    );

    if (!result.trim()) {
      throw new Error(
        `The selected model (${model.name}) returned an empty response.`
      );
    }

    return result;
  } catch (error) {
    if (error instanceof vscode.LanguageModelError) {
      throw new Error(
        `Language model error: ${error.message} (code: ${error.code})`
      );
    }

    throw error;
  } finally {
    cancellation.dispose();
  }
}
