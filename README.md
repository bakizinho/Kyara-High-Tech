🚀 INSTALAÇÃO NO TERMUX

1️⃣ Atualize os pacotes

Abra o Termux e execute:

pkg update -y

Depois:

pkg upgrade -y

---

2️⃣ Instale o Git

pkg install -y git

---

3️⃣ Instale o Node.js

pkg install -y nodejs-lts

---

4️⃣ Confira as versões

node -v

npm -v

git --version

---

5️⃣ Libere o armazenamento

Execute este comando apenas uma vez:

termux-setup-storage

Quando o Android pedir permissão, toque em Permitir.

---

6️⃣ Entre na pasta de armazenamento

cd ~/storage

---

7️⃣ Baixe a Kyara

git clone https://github.com/bakizinho/Kyara-High-Tech.git

---

8️⃣ Entre na pasta da Kyara

cd ~/storage/Kyara-High-Tech

---

9️⃣ Instale as dependências

npm install

Aguarde a instalação terminar.

---

🔟 Inicie a Kyara

npm start

---

🔄 INICIAR NOVAMENTE

Se você já instalou tudo e fechou o Termux, não precisa repetir a instalação.

Use somente:

cd ~/storage/Kyara-High-Tech

Depois:

npm start

---

⚡ INSTALAÇÃO RÁPIDA

Se preferir fazer a instalação usando menos etapas:

pkg update -y

pkg upgrade -y

pkg install -y git nodejs-lts

termux-setup-storage

cd ~/storage

git clone https://github.com/bakizinho/Kyara-High-Tech.git

cd ~/storage/Kyara-High-Tech

npm install

npm start

---

🛠️ SE A KYARA JÁ ESTIVER INSTALADA

Entre na pasta:

cd ~/storage/Kyara-High-Tech

Atualize o projeto:

git pull

Instale possíveis dependências novas:

npm install

Inicie:

npm start