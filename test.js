import express from 'express'
import multer from 'multer'
import { SerialPort } from 'serialport'
import fs from 'fs'
import cors from 'cors'
import path from 'path'

const app = express()
const port = 3001

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}))
app.use(express.json())

// Configuración del puerto serie
const serialPort = new SerialPort({
  path: 'COM1',
  baudRate: 9600,
})

// Configuración de Multer para guardar los archivos temporalmente
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/') // Carpeta donde se almacenarán los archivos subidos
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname) // Usa el nombre original del archivo
    },
  })
  
  const upload = multer({ storage })

// Ruta para recibir el archivo desde el frontend
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No se ha cargado ningún archivo.')
  }

  const filePath = req.file.path
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error al leer el archivo:', err)
      return res.status(500).send('Error al leer el archivo')
    }

    // Dividir el archivo en fragmentos de 64 bytes y enviarlo por RS232
    const chunks = data.match(/.{1,64}/g) || []
    serialPort.write(`START_FILE ${req.file.originalname} ${data.length}\n`)

    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        serialPort.write(`CHUNK ${index} ${chunk}\n`)
      }, index * 50)
    })

    // Enviar señal de finalización
    setTimeout(() => {
      serialPort.write('END_FILE\n')
      console.log(`Archivo ${req.file.originalname} enviado por RS232`)
      res.send('Archivo enviado correctamente')
    }, chunks.length * 50)
  })
})

// Ruta para enviar un mensaje
app.post('/send-message', (req, res) => {
  const { message } = req.body
  console.log(message)
  if (!message) {
    return res.status(400).send('No se ha proporcionado ningún mensaje.')
  }

  serialPort.write(`MESSAGE ${message}\n`, (err) => {
    if (err) {
      console.error('Error al enviar el mensaje:', err)
      return res.status(500).send('Error al enviar el mensaje')
    }
    res.send('Mensaje enviado correctamente')
  })
})

// Ruta para eliminar un archivo
app.delete('/delete-file', (req, res) => {
  const { fileName } = req.body
  console.log(fileName)
  if (!fileName) {
    console.log('No se ha proporcionado ningún nombre de archivo.')
    return res.status(400).send('No se ha proporcionado ningún nombre de archivo.')
  }

  const filePath = path.join('uploads', fileName)
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error al eliminar el archivo:', err)
      return res.status(500).send('Error al eliminar el archivo')
    }
    res.send('Archivo eliminado correctamente')
  })
})

// Ruta para crear un archivo
app.post('/create-file', (req, res) => {
  const { fileName, fileContent } = req.body
  if (!fileName || !fileContent) {
    return res.status(400).send('No se ha proporcionado el nombre o contenido del archivo.')
  }

  const filePath = path.join('uploads', fileName)
  fs.writeFile(filePath, fileContent, (err) => {
    if (err) {
      console.error('Error al crear el archivo:', err)
      return res.status(500).send('Error al crear el archivo')
    }
    res.send('Archivo creado correctamente')
  })
})

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`)
})

serialPort.on('open', () => {
  console.log('Puerto serie abierto')
})

serialPort.on('error', (err) => {
  console.error('Error en el puerto serie:', err)
})