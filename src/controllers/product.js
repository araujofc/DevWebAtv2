const db = require('../config/database');
const { ImgurClient } = require('imgur');
const dotenv = require('dotenv');
const { createReadStream } = require('fs');

exports.getAllProducts = async (req, res) => {
    if(req.query.hasOwnProperty('limit') && req.query.hasOwnProperty('offset')) {

        const { limit, offset } = req.query;
        try {
            const getAllProductsQuery = await db.query(
                "SELECT * FROM produtos LIMIT $1 OFFSET $2",
                [limit, offset]
            );
            if(getAllProductsQuery.rows.length !== 0) {
                res.status(200).send(
                    {
                        sucesso : 1,
                        produtos : getAllProductsQuery.rows,
                        qtde_produtos : getAllProductsQuery.rows.length
                    }
                );
            }
        }
        catch (err) {
            var errorMsg = "erro BD: ";-
                res.status(200).send(
                    {
                        sucesso : 0,
                        cod_erro : 2,
                        erro : errorMsg.concat(err)
                    }
                );
        }
    }
    else {
        var errorMsg = "faltam parametros";
        res.status(200).send(
            {
                sucesso : 0,
                cod_erro : 3,
                erro : errorMsg
            }
        );
    }
};

exports.addProduct = async (req, res) => {
    if('nome' in req.body && 'preco' in req.body && 'descricao' in req.body 
    && req.hasOwnProperty('file')) {
        const { nome, preco, descricao } = req.body;

        const imgurClient = new ImgurClient({ clientId: process.env.IMGUR_CLIENT_ID });
        const imgurRes = await imgurClient.upload(
            {
                image: createReadStream(req.file.path),
                type: 'stream'
            }
        );
        if(imgurRes.status === 200) {
            try {
                const addProductQuery = await db.query(
                    "INSERT INTO produtos(nome, preco, descricao, img, usuarios_login) VALUES($1, $2, $3, $4, $5)",
                    [nome, preco, descricao, imgurRes.data.link, req.auth.user]
                );
                res.status(200).send(
                    {
                        sucesso : 1
                    }
                );
            }
            catch(err) {
                var erroMsg = "erro BD: ";
                res.status(200).send(
                    {
                        sucesso : 0,
                        cod_erro : 2,
                        erro : erroMsg.concat(err)
                    }
                );
            }
        }
        else {
            res.status(200).send(
                {
                    sucesso : 0,
                    cod_erro : 2,
                    erro : "erro IMGUR: falha ao subir imagem para o IMGUR"
                }
            );
        }
    }
    else {
        var erroMsg = "faltam parametros";
		res.status(200).send(
			{
				sucesso : 0,
				cod_erro : 3,
				erro : erroMsg
			}
		);
    }
};

exports.getProductDetails = async (req, res) => {
    if (req.query.hasOwnProperty('id')) {
        const { id } = req.query;

        try {
            const getProductDetailsQuery = await db.query(
                "SELECT * FROM produtos WHERE id = $1",
                [id]
            );

            if (getProductDetailsQuery.rows.length !== 0) {
                const produto = getProductDetailsQuery.rows[0];
                res.status(200).send({
                    sucesso: 1,
                    nome: produto.nome,
                    preco: produto.preco,
                    descricao: produto.descricao,
                    criado_por: produto.usuarios_login,
                    criado_em: produto.data_criacao,
                    img: produto.img
                });
            } else {
                res.status(200).send({
                    sucesso: 0,
                    erro: "Produto não encontrado",
                    cod_erro: 4
                });
            }
        } catch (err) {
            var errorMsg = "erro BD: ";
            res.status(200).send({
                sucesso: 0,
                cod_erro: 2,
                erro: errorMsg.concat(err)
            });
        }
    } else {
        var errorMsg = "faltam parametros";
        res.status(200).send({
            sucesso: 0,
            cod_erro: 3,
            erro: errorMsg
        });
    }
};

exports.updateProduct = async (req, res) => {
    if (req.body.hasOwnProperty('id') && req.body.hasOwnProperty('novo_nome') &&
        req.body.hasOwnProperty('novo_preco') && req.body.hasOwnProperty('nova_descricao') &&
        req.body.hasOwnProperty('nova_img')) {

        const { id, novo_nome, novo_preco, nova_descricao, nova_img } = req.body;

        try {
            const getProductCreatorQuery = await db.query(
                "SELECT usuarios_login FROM produtos WHERE id = $1",
                [id]
            );

            if (getProductCreatorQuery.rows.length !== 0) {
                const productCreator = getProductCreatorQuery.rows[0].usuarios_login;
                if (productCreator === req.auth.user) {
                    const updateProductQuery = await db.query(
                        "UPDATE produtos SET nome = $1, preco = $2, descricao = $3, img = $4 WHERE id = $5",
                        [novo_nome, novo_preco, nova_descricao, nova_img, id]
                    );

                    res.status(200).send({
                        sucesso: 1
                    });
                } else {
                    res.status(200).send({
                        sucesso: 0,
                        erro: "Você não tem permissão para atualizar este produto",
                        cod_erro: 5
                    });
                }
            } else {
                res.status(200).send({
                    sucesso: 0,
                    erro: "Produto não encontrado",
                    cod_erro: 4
                });
            }
        } catch (err) {
            var errorMsg = "erro BD: ";
            res.status(200).send({
                sucesso: 0,
                cod_erro: 2,
                erro: errorMsg.concat(err)
            });
        }
    } else {
        var errorMsg = "faltam parametros";
        res.status(200).send({
            sucesso: 0,
            cod_erro: 3,
            erro: errorMsg
        });
    }
};

exports.deleteProduct = async (req, res) => {
    if (req.body.hasOwnProperty('id')) {
        const { id } = req.body;

        try {
            // Verifica se o usuário é o criador do produto
            const getProductCreatorQuery = await db.query(
                "SELECT usuarios_login FROM produtos WHERE id = $1",
                [id]
            );

            if (getProductCreatorQuery.rows.length !== 0) {
                const productCreator = getProductCreatorQuery.rows[0].usuarios_login;
                if (productCreator === req.auth.user) {
                    // Exclui o produto
                    const deleteProductQuery = await db.query(
                        "DELETE FROM produtos WHERE id = $1",
                        [id]
                    );

                    res.status(200).send({
                        sucesso: 1
                    });
                } else {
                    res.status(200).send({
                        sucesso: 0,
                        erro: "Você não tem permissão para excluir este produto",
                        cod_erro: 5
                    });
                }
            } else {
                res.status(200).send({
                    sucesso: 0,
                    erro: "Produto não encontrado",
                    cod_erro: 4
                });
            }
        } catch (err) {
            var errorMsg = "erro BD: ";
            res.status(200).send({
                sucesso: 0,
                cod_erro: 2,
                erro: errorMsg.concat(err)
            });
        }
    } else {
        var errorMsg = "faltam parametros";
        res.status(200).send({
            sucesso: 0,
            cod_erro: 3,
            erro: errorMsg
        });
    }
};
