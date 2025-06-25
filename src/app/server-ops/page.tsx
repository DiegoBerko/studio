
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { performFileOperation } from '@/ai/flows/file-operations';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ServerOpsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [fileContent, setFileContent] = useState('');
  const [writeContent, setWriteContent] = useState('This is some new content to write.\nTimestamp: ' + new Date().toISOString());
  const [responseMessage, setResponseMessage] = useState('');
  const { toast } = useToast();

  const handleReadFile = async () => {
    setIsLoading(true);
    setResponseMessage('');
    setFileContent('');
    try {
      const result = await performFileOperation({ operation: 'read' });
      setResponseMessage(result.message);
      if (result.success && result.content) {
        setFileContent(result.content);
      } else if (!result.success) {
         toast({
            title: "Error de Lectura",
            description: result.message,
            variant: "destructive",
         });
      }
    } catch (error) {
      console.error(error);
      const errorMessage = (error as Error).message || 'An unknown error occurred.';
      setResponseMessage(`Error: ${errorMessage}`);
       toast({
        title: "Error de Red",
        description: errorMessage,
        variant: "destructive",
       });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWriteFile = async () => {
    setIsLoading(true);
    setResponseMessage('');
    try {
      const result = await performFileOperation({ operation: 'write', content: writeContent });
      setResponseMessage(result.message);
      toast({
        title: "Operación de Escritura",
        description: result.message,
      });
    } catch (error) {
      console.error(error);
      const errorMessage = (error as Error).message || 'An unknown error occurred.';
      setResponseMessage(`Error: ${errorMessage}`);
      toast({
        title: "Error de Red",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary-foreground">Operaciones en el Servidor</h1>
        <p className="text-muted-foreground mt-2">
          Este es un ejemplo de cómo el cliente (tu navegador) puede solicitar al servidor que realice operaciones, como leer o escribir archivos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leer Archivo del Servidor</CardTitle>
          <CardDescription>
            Haz clic en el botón para solicitar al servidor que lea el archivo <code>src/data/sample.txt</code> y muestre su contenido aquí.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleReadFile} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Leer Archivo del Servidor
          </Button>
          {fileContent && (
            <pre className="p-4 bg-muted rounded-md text-sm text-muted-foreground whitespace-pre-wrap">
              {fileContent}
            </pre>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Escribir Archivo en el Servidor (Simulado)</CardTitle>
          <CardDescription>
            El contenido de este área de texto será enviado al servidor para ser "escrito". En este ejemplo, el servidor registrará el contenido en su consola en lugar de escribir en el disco.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={writeContent}
            onChange={(e) => setWriteContent(e.target.value)}
            rows={5}
            placeholder="Contenido a escribir..."
          />
          <Button onClick={handleWriteFile} disabled={isLoading}>
             {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Escribir en el Servidor
          </Button>
        </CardContent>
      </Card>

      {responseMessage && (
          <Card className="bg-primary/10 border-primary/20">
              <CardHeader>
                  <CardTitle className="text-base">Respuesta del Servidor</CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-primary-foreground">{responseMessage}</p>
              </CardContent>
          </Card>
      )}

    </div>
  );
}
