'use strict'

import { Event_Dispatcher } from './Event_Dispatcher.js'

/**
 * @example
 *  const frost = new Frost_Twitch_Extension('139960179') // channel ID (twitch.tv/pyompy there)
 * 
 *  frost.addEventListener('down', ( event ) => {
 *      console.log('click down')
 *      console.log('Twitch user ID: ' + event.id) // ID can be anonymous see https://dev.twitch.tv/docs/extensions#identity
 *      console.log('x: ' + event.x) // x is from 0 to 1
 *      console.log('y: ' + event.y) // y is from 0 to 1
 *  })
 * 
 *  frost.addEventListener('move', ( event ) => {
 *      console.log('move')
 *      console.log('Twitch user ID: ' + event.id) // ID can be anonymous see https://dev.twitch.tv/docs/extensions#identity
 *      console.log('x: ' + event.x) // x is from 0 to 1
 *      console.log('y: ' + event.y) // y is from 0 to 1
 *      console.log('Delta x: ' + event.deltaX) // deltaX is from 0 to 1
 *      console.log('Delta y: ' + event.deltaY) // deltaY is from 0 to 1
 *  })
 * 
 *  frost.addEventListener('up', ( event ) => {
 *      console.log('click up')
 *      console.log('Twitch user ID: ' + event.id) // ID can be anonymous see https://dev.twitch.tv/docs/extensions#identity
 *      console.log('x: ' + event.x) // x is from 0 to 1
 *      console.log('y: ' + event.y) // y is from 0 to 1
 *  })
 * 
*/
export class Frost_Twitch_Extension extends Event_Dispatcher {

    constructor(channelID = '139960179') {
        super()

        const ws_auth = (url = `ws://localhost/`, message = channelID) => {
            return new Promise((resolve) => {
                const ws = new WebSocket(url)
                const on_close = () => {
                    resolve()
                }
                ws.addEventListener('close', on_close)
                setTimeout(() => { ws.close() }, 30_000)
                ws.onopen = () => {
                    ws.onmessage = (e) => {
                        resolve(ws)
                    }
                    ws.send(message)
                }
            })
        }

        const interface_uint8array = new Uint8Array(16)
        const data_view = new DataView(interface_uint8array.buffer)
        const text_decoder = new TextDecoder()

        const init_ws = async () => {
            const ws = await ws_auth(
                `wss://obs3d.com/`,
                channelID
            )
            if (ws === undefined) {
                setTimeout(init_ws, 5000)
                return
            }

            const ping = new Blob([0])
            const interval = setInterval(() => { ws.send(ping) }, 180_000)

            ws.addEventListener('close', () => {
                clearInterval(interval)
                setTimeout(init_ws, 5000)
            })

            ws.onmessage = (e) => {
                const payload = e.data
                if (payload.arrayBuffer === undefined) return
                payload.arrayBuffer().then((buffer) => {
                    const uint8array = new Uint8Array(buffer)
                    const cmd = uint8array[0]
                    if (cmd === 10) {
                        interface_uint8array.set(uint8array.slice(1, 9))
                        const x = data_view.getFloat32(0)
                        const y = data_view.getFloat32(4)
                        const id = text_decoder.decode(uint8array.slice(9))

                        this.emit('down', { id: id, x: x, y: y })
                    }

                    else if (cmd === 11) {
                        interface_uint8array.set(uint8array.slice(1, 17))
                        const x = data_view.getFloat32(0)
                        const y = data_view.getFloat32(4)
                        const delta_x = data_view.getFloat32(8)
                        const delta_y = data_view.getFloat32(12)

                        const id = text_decoder.decode(uint8array.slice(17))

                        this.emit('move', { id: id, x: x, y: y, deltaX: delta_x, deltaY: delta_y })
                    }

                    else if (cmd === 12) {
                        interface_uint8array.set(uint8array.slice(1, 9))
                        const x = data_view.getFloat32(0)
                        const y = data_view.getFloat32(4)
                        const id = text_decoder.decode(uint8array.slice(9))

                        this.emit('up', { id: id, x: x, y: y })
                    }
                })
            }
        }
        init_ws()
    }
}