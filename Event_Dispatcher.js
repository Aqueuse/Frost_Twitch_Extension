
export class Event_Dispatcher {
    
    onChange = {}
    
    addEventListener = (event, callback) => {
        if (this.onChange[event] === undefined) this.onChange[event] = new Set()
        this.onChange[event].add(callback)
    }

    removeEventListener = (event, callback) => {
        const set = this.onChange[event]
        if (set === undefined) return
        set.delete(callback)
        if (set.sise === 0) delete this.onChange[event]
    }

    emit = (event, ...info) => {
        if (this.onChange[event] === undefined) return
        for (const cb of this.onChange[event]) cb(...info)
    }
}