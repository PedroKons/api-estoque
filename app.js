import { fastify } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import cors from '@fastify/cors';

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
    const { data, error } = await supabase.from('products').select('*');
    if (error) return handleError(reply, error, 'Erro ao buscar os produtos');
    reply.send({ message: 'Produtos encontrados com sucesso', data });
  } catch (err) {
    handleError(reply, err, 'Erro interno do servidor');
  }
});

// Rota POST - Inserir produto
server.post('/products', async (request, reply) => {
  const { id, name, amount, price } = request.body;

  // Validação de campos
  if (!id || !name || !amount || !price) {
    return reply.status(400).send({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    const { error } = await supabase.from('products').insert([{ id, name, price, amount }]);
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

// Inicializar o servidor
const PORT = process.env.PORT || 3333;
server.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Servidor rodando em ${address}`);
});
