# CHATBOT 2024

# *Instalação completa*:

Antes de começarmos, você precisa estar com uma VPS e Domínio em mãos!

Aponte sua VPS para seu domínio no DNS.

Aponte 2 subdomínios para sua VPS:

Exemplo:

Para frontend: app.seudominioaqui.com
Para backend: api.seudominioaqui.com

# *Pronto?! vamos lá..*

Atenção: O texto em cor roxa são as linhas de comando que devem ser executadas no seu terminal.

# *Atualização da VPS:*

apt update

apt upgrade

# *Instalação do aaPanel:*
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh

bash install.sh

# *Após logar no aaPanel:*

No menu “files”, dentro da pasta “home” do aapanel:

Abra o terminal dentro do aapanel e execute o seguinte comando:

git clone [link do seu instalador do github aqui]

Após clonar libere as permissões de root para pasta do instalador:

chmod -R 777 [nome da pasta do instalador aqui]

*Vamos instalar o Chatbot:*

Execute o comando:

./install_primaria

Bem vindo (a) ao Gerenciador chatbot, selecione abaixo a próxima ação:

Escreva: 0

Insira senha para o usuário Deploy e Banco de dados (Não utilizar caracteres especiais):

Senha sugerida: 123456 (coloque a senha que quiser aqui).

Insira o link do github que deseja instalar:

[link do seu código do github aqui]

Informe um nome para a instância/Empresa que será instalada(Não utilizar espaços ou caracteres especiais, utilizar letras minúsculas;)

Nome sugerido: empresa01 (coloque o nome da empresa que quiser aqui).

Informe a qtde de conexões/whats que a empresa01 poderá cadastrar:
Coloque: 9999

Informe o qtde de usuários/atendentes que a empresa01 poderá
cadastrar:
Coloque: 9999

Digite o domínio do Frontend/painel para a empresa01:
Coloque: app.seudominio.com

Digite o domínio do Backend/painel para a empresa01:
Coloque: api.seudominio.com

Digite a porta do Frontend para a empresa01, Ex: 3000 até 3999:
Coloque: 3000

Digite a porta do Backend para esta instancia, Ex: 4000 até 4999:
Coloque: 4000
Digite a porta do Redis/agendamento msg para a empresa01, Ex 5000
até 5999:
Coloque: 5000

Obs: Caso o seu código fonte estiver privado lá no github, a instalação irá lhe pedir o usuário e senha, não esqueça que a sua senha do github é o token gerado no seu perfil.

Após a instalação, você precisa liberar 4 portas no Security do aaPanel:

No Menu do aapanel a sua direita, você encontra o Security.

Libere as portas: 3000, 4000, 443.

Pronto, sua instalação está concluída!

# REQUISICOES - CHATBOT 2024

![image](https://github.com/BrendonReis/RepositorioAtualizado---chatbot/assets/72474033/027809a9-341f-4ddb-a95f-2f5eff4a93a0)

![image](https://github.com/BrendonReis/RepositorioAtualizado---chatbot/assets/72474033/e7b5c75d-acd1-46b6-becf-d8dc4b87822e)

![image](https://github.com/BrendonReis/RepositorioAtualizado---chatbot/assets/72474033/93f44ac7-ebe9-4701-a4d6-b15a922f6cc2)

![image](https://github.com/BrendonReis/RepositorioAtualizado---chatbot/assets/72474033/48b265e9-d7c5-4d58-a2aa-48f280f9b241)

![image](https://github.com/BrendonReis/RepositorioAtualizado---chatbot/assets/72474033/1f04d5d8-bf92-4115-9a61-7260cddc21b1)

![image](https://github.com/BrendonReis/RepositorioAtualizado---chatbot/assets/72474033/bd4576ef-6781-4bc7-ac9e-4c9ee71607e6)

![image](https://github.com/BrendonReis/RepositorioAtualizado---chatbot/assets/72474033/3befc07d-2d19-470d-a30c-491db729ea84)






