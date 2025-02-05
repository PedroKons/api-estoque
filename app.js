import { fastify } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import cors from '@fastify/cors';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client from './s3Client.js';


const server = fastify();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configuração do CORS
server.register(cors, {
  origin: '*', // Em produção, restrinja para domínios específicos.
});

// Handler reutilizável para erros
const handleError = (reply, error, message) => {
  console.error(message, error);
  reply.status(500).send({ error: message, details: error?.message });
};

// Rota GET - Listar todos os produtos
server.get('/products', async (request, reply) => {
  try {
    const { data, error } = await supabase.from('products').select('*, categories (name), supplier (name)');
    if (error) return handleError(reply, error, 'Erro ao buscar os produtos');
    reply.send({ message: 'Produtos encontrados com sucesso', data });
  } catch (err) {
    handleError(reply, err, 'Erro interno do servidor');
  }
});

// Rota Get - Listar Fornecedores
server.get('/supplier', async (request, reply) => {
  try {
    const { data, error } = await supabase.from('supplier').select('*');
    if (error) return handleError(reply, error, 'Erro ao buscar os fornecedores');
    reply.send({ message: 'Fornecedores encontrados com sucesso', data });
  } catch (err) {
    handleError(reply, err, 'Erro interno do servidor');
  }
});

// Rota Get - Listar Categorias
server.get('/categories', async (request, reply) => {
  try {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) return handleError(reply, error, 'Erro ao buscar as categorias');
    reply.send({ message: 'Categorias encontradas com sucesso', data });
  } catch (err) {
    handleError(reply, err, 'Erro interno do servidor');
  }
});

// Rota POST - Inserir produto
server.post('/products', async (request, reply) => {
  const { id, name, amount, price, coastprice, lastpurchase, idsupplier, lastupdate, idcategorie } = request.body;

  // Validação de campos
  if (!id || !name || !amount || !price) {
    return reply.status(400).send({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    const { error } = await supabase.from('products').insert([{ id, name, amount, price, coastprice, lastpurchase, idsupplier, lastupdate, idcategorie }]);
    if (error) return handleError(reply, error, 'Erro ao inserir o produto');
    reply.send({ message: 'Produto cadastrado com sucesso' });
  } catch (err) {
    handleError(reply, err, 'Erro interno ao cadastrar produto');
  }
});

// Rota PATCH - Atualizar produto
server.patch('/products/:id', async (request, reply) => {
  const { id } = request.params;
  const updates = request.body;

  if (!updates || Object.keys(updates).length === 0) {
    return reply.status(400).send({ error: 'Nenhum campo para atualizar foi enviado' });
  }

  try {
    const { error } = await supabase.from('products').update(updates).eq('id', id);
    if (error) return handleError(reply, error, 'Erro ao atualizar o produto');
    reply.send({ message: 'Produto atualizado com sucesso' });
  } catch (err) {
    handleError(reply, err, 'Erro interno ao atualizar produto');
  }
});

// Rota DELETE - Excluir produto
server.delete('/products/:id', async (request, reply) => {
  const { id } = request.params;

  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return handleError(reply, error, 'Erro ao excluir o produto');
    reply.send({ message: 'Produto excluído com sucesso' });
  } catch (err) {
    handleError(reply, err, 'Erro interno ao excluir produto');
  }
});

server.post('/autenticacao', async (request, reply) => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email e senha são obrigatórios' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return reply.status(401).send({ error: 'Falha na autenticação', details: error.message });
    }

    return reply.send({ message: 'Autenticação bem-sucedida', data });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ error: 'Erro interno do servidor' });
  }
});

server.get('/generate-upload-url', async (request, reply) => {
  const { filename, contentType } = request.query;

  if (!filename || !contentType) {
    return reply
      .code(400)
      .send({ error: 'Os parâmetros "filename" e "contentType" são obrigatórios.' });
  }

  const bucketName = 'img'; // Substitua com o nome do seu bucket
  const key = `uploads/${filename}`;    // Define o caminho dentro do bucket onde a imagem será armazenada
  const publicUrl = `https://pub-2e0de451f23245dea255e8acccb36d8c.r2.dev/${key}`;
  
  // Cria o comando para realizar o PUT (upload) do objeto
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  // Define o tempo de expiração da URL assinada (em segundos)
  const expiresIn = 900; // 15 minutos

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    // Retorna a URL assinada para o cliente
    return { signedUrl, key, publicUrl };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Erro ao gerar a URL assinada.' });
  }
});


const PORT = process.env.PORT || 3333;

server.listen({ port: Number(PORT), host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error("Erro ao iniciar o servidor:", err);
    process.exit(1);
  }
  console.log(`Servidor rodando em ${address}`);
});


