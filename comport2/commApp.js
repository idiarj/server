// archivo2.js
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import fs from 'fs'
import path from 'path'

// Configuración del puerto serie COM2
const serialPortReceiver = new SerialPort({
  path: 'COM2',
  baudRate: 9600,
})

// Configuración del parser para leer líneas
const parser = serialPortReceiver.pipe(new ReadlineParser({ delimiter: '\n' }))

serialPortReceiver.on('open', () => {
  console.log('Puerto serie COM2 abierto')
})

parser.on('data', (data) => {
  console.log('Datos recibidos en COM2:', data)
  const [command, ...args] = data.split(' ')

  if (command === 'MESSAGE') {
    const message = args.join(' ')
    console.log('Mensaje recibido:', message)
  } else if (command === 'START_FILE') {
    console.log('estoy aca')
    const [fileName, fileSize] = args
    const filePath = path.join(fileName)
    fs.writeFileSync(filePath, '')
    console.log(`Iniciando recepción de archivo: ${fileName} (${fileSize} bytes)`)
  } else if (command === 'CHUNK') {
    console.log('estoy aqui')
    const index = args[0]
    const chunk = args.slice(1).join(' ')
    const filePath = path.join(args.slice(1).join(' '))
    console.log(filePath)
    console.log(chunk)
    fs.appendFileSync(filePath, chunk)
    console.log(`Recibiendo fragmento ${index}: ${chunk}`)
  } else if (command === 'END_FILE') {
    console.log('Recepción de archivo completada')
  } else {
    console.log('Comando desconocido:', command)
  }
})

serialPortReceiver.on('error', (err) => {
  console.error('Error en el puerto serie COM2:', err)
})

