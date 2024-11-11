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
    try {
        const {path} = req.file
        console.log(path)
        fs.readFile(path, 'utf8', (err, data) => {
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
    } catch (error) {
        console.log(error)
        res.status(400).json({error: 'Error al subir el archivo'})
    }
})

// Ruta para enviar un mensaje
app.post('/send-message', (req, res) => {
    try {
        console.log(req.body)
        const {message} = req.body
        console.log(message)
        serialPort.write(`MESSAGE ${message}\n`)
    } catch (error) {
        console.log(error)
        res.status(400).json({error: 'Error al enviar el mensaje.'})
    }
  })

// Ruta para eliminar un archivo
app.delete('/delete-file', (req, res) => {
    try {
        const { fileName } = req.body
        console.log(fileName)
    } catch (error) {
        console.log(error)
        res.status(400).json({error: 'Error al borrar el archivo'})
    }

})

// Ruta para crear un archivo
app.post('/create-file', (req, res) => {
    try {
        const { fileName, fileContent } = req.body
        console.log(fileName)
        console.log(fileContent)
        const filePath = path.join('uploads', fileName)
        fs.writeFile(filePath, fileContent, (err) => {
          if (err) {
            console.error('Error al crear el archivo:', err)
            return res.status(500).send('Error al crear el archivo')
          }
    
          // Leer el archivo y enviarlo por RS232
          fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
              console.error('Error al leer el archivo:', err)
              return res.status(500).send('Error al leer el archivo')
            }
    
            // Dividir el archivo en fragmentos de 64 bytes y enviarlo por RS232
            const chunks = data.match(/.{1,64}/g) || []
            serialPort.write(`START_FILE ${fileName} ${data.length}\n`)
    
            chunks.forEach((chunk, index) => {
              setTimeout(() => {
                serialPort.write(`CHUNK ${index} ${chunk}\n`)
              }, index * 50)
            })
    
            // Enviar señal de finalización
            setTimeout(() => {
              serialPort.write('END_FILE\n')
              console.log(`Archivo ${fileName} enviado por RS232`)
              res.send('Archivo creado y enviado correctamente')
            }, chunks.length * 50)
          })
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ error: 'Error al crear el archivo' })
      }


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