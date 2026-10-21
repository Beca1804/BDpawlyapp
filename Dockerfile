
# Imagen de Node.js
FROM node:22-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el código de PAWLYAPP
COPY . .

# Puerto de Apollo Server
EXPOSE 4000

# Iniciar el backend
CMD ["npm", "run", "dev"]
