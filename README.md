# 💪 GymFlow

Aplicativo simples e minimalista para gerenciar seus treinos com foco e eficiência.

## ✨ Características

- 🏋️ **5 Rotinas Independentes** - Organize treinos A, B, C, D, E
- ⏱️ **Cronômetro Integrado** - Rastreie tempo de sessão
- 📝 **Notas por Exercício** - Adicione observações e cargas
- 🔄 **Drag & Drop** - Reordene exercícios facilmente
- 💾 **Backup/Restauração** - Exporte e importe em JSON
- 📊 **Progresso Visual** - Barra mostra quantos exercícios completou
- 🌙 **Dark Mode** - Design minimalista e limpo
- 📱 **100% Offline** - Tudo fica no seu navegador

---

## 📖 Como Usar

### 1. Adicionar Exercício
```
Digite no campo: "Exercício ; Carga"
Exemplo: "Supino ; 80kg"
Pressione ENTER ou clique +
```

### 2. Durante o Treino
- ✓ Marque exercícios conforme completa
- 📝 Adicione notas no campo abaixo
- ⏱️ Cronômetro conta automaticamente
- 🔄 Reordene com drag & drop se precisar

### 3. Finalizar
- Quando 100% dos exercícios estão marcados
- Clique "FINALIZAR TREINO"
- Para reiniciar: clique "REINICIAR TREINO"

### 4. Backup
- **Exportar:** Clique "Sincronizar" (baixa arquivo)
- **Importar:** Clique "Importar" (selecione arquivo salvo)

---

## ❓ FAQ

**P: Meus dados são perdidos se fechar o app?**  
R: Não. Tudo fica no armazenamento do navegador. Se limpar cache, será perdido. Faça backup!

**P: O app funciona offline?**  
R: Sim! Depois de carregado uma vez, funciona totalmente offline com dados salvos.

**P: O cronômetro continua se fechar o app?**  
R: Sim! O timer persiste. Quando volta, mostra o tempo decorrido desde o fechamento.

**P: Posso usar em múltiplos dispositivos?**  
R: Cada dispositivo tem seus dados. Para sincronizar: exporte de um, importe no outro.

**P: Como adicionar a carga do exercício?**  
R: Use o formato: `Exercício ; Carga`  
Exemplos: `Supino ; 80kg`, `Rosca ; 8x12`, `Agachamento ; 5x5`

**P: Posso editar um exercício?**  
R: Clique no nome do exercício para editar. Para deletar, clique no ✕ vermelho.

**P: Onde meus dados são armazenados?**  
R: No LocalStorage do seu navegador (privado, apenas você tem acesso).

---

## 🛠️ Tecnologias

- HTML5 + CSS3 + JavaScript (sem dependências)
- [Sortable.js](https://sortablejs.github.io/Sortable/) - Drag & Drop
- [Google Fonts](https://fonts.google.com/) - Tipografia

---

## 📁 Estrutura

```
gymflow/
├── index.html     # Estrutura
├── style.css      # Estilos
├── script.js      # Lógica
└── README.md      # Este arquivo
```

## 📄 Licença

MIT License

---

**Made with 💪 for fitness enthusiasts.**
