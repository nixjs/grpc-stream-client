import * as grpcWeb from 'grpc-web'
import * as pbjs from 'google-protobuf/google/protobuf/empty_pb'
import { Types } from '@nixjs23n6/types'
import { Objectify } from '@nixjs23n6/objectify'
import { BaseBackOff } from '@nixjs23n6/backoff-typescript'
import { StreamEvents } from './enums'
import { Options, RetryEventDetails, StreamEventMap } from './types'

type eventListener<K extends StreamEvents> = {
    readonly listener: (instance: Stream, ev: StreamEventMap[K]) => any
    readonly options?: boolean | EventListenerOptions
}

type StreamEventsListeners = {
    metadata: eventListener<StreamEvents.metadata>[]
    data: eventListener<StreamEvents.data>[]
    end: eventListener<StreamEvents.end>[]
    error: eventListener<StreamEvents.error>[]
    retry: eventListener<StreamEvents.retry>[]
}

export class Stream {
    stream?: grpcWeb.ClientReadableStream<any>
    client: any
    method: string
    private readonly request: Types.Object<any> | pbjs.Empty
    private metadata?: grpcWeb.Metadata
    private readonly options?: Options
    private readonly backoff?: BaseBackOff
    private retries = 0
    private readonly eventListeners: StreamEventsListeners = { metadata: [], data: [], end: [], error: [], retry: [] }

    constructor(
        client: any,
        method: string,
        request: Types.Object<any> | pbjs.Empty,
        metadata?: grpcWeb.Metadata | undefined,
        backoff?: BaseBackOff,
        options?: Options
    ) {
        this.client = client
        this.method = method
        this.request = request
        this.metadata = metadata
        this.options = options
        this.backoff = backoff
        this.connect()
    }

    public get metaData(): grpcWeb.Metadata | undefined {
        return this.metadata
    }

    public set metaData(v: grpcWeb.Metadata | undefined) {
        this.metadata = v ? Objectify.merge(this.metadata, v) : this.metaData
    }

    public addEventListener<K extends StreamEvents>(
        type: K,
        listener: (instance: Stream, ev: StreamEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): void {
        const _eventListener = { listener, options } as eventListener<K>
        const eventListeners = this.eventListeners[type] as eventListener<K>[]
        eventListeners.push(_eventListener)
    }

    public removeEventListener<K extends StreamEvents>(
        type: K,
        listener: (instance: Stream, ev: StreamEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ): void {
        // eslint-disable-next-line @typescript-eslint/no-extra-semi
        ;(this.eventListeners[type] as eventListener<K>[]) = (this.eventListeners[type] as eventListener<K>[]).filter((l) => {
            return l.listener !== listener && (l.options === undefined || l.options !== options)
        })
    }

    private dispatchEvent<K extends StreamEvents>(type: K, ev: StreamEventMap[K]) {
        const listeners = this.eventListeners[type] as eventListener<K>[]
        const onceListeners = [] as eventListener<K>[]
        listeners.forEach((l) => {
            l.listener(this, ev) // call listener
            if (l.options !== undefined && (l.options as AddEventListenerOptions).once) onceListeners.push(l)
        })
        onceListeners.forEach((l) => this.removeEventListener(type, l.listener, l.options)) // remove 'once'-listeners
    }

    private connect(): void {
        if (this.stream !== undefined) {
            // remove all event-listeners from broken socket
            this.stream.removeListener(StreamEvents.metadata, this.handleMetadataEvent)
            this.stream.removeListener(StreamEvents.data, this.handleMessageEvent)
            this.stream.removeListener(StreamEvents.end, this.handleCloseEvent)
            this.stream.removeListener(StreamEvents.error, this.handleErrorEvent)
            this.stream.cancel()
        }
        this.stream = (this.client as any)[this.method](this.request, this.metadata) as grpcWeb.ClientReadableStream<any>
        this.stream?.on(StreamEvents.metadata, this.handleMetadataEvent)
        this.stream?.on(StreamEvents.data, this.handleMessageEvent)
        this.stream?.on(StreamEvents.end, this.handleCloseEvent)
        this.stream?.on(StreamEvents.error, this.handleErrorEvent)
    }

    private handleMetadataEvent = (ev: grpcWeb.Metadata) => this.handleEvent(StreamEvents.metadata, ev)

    private handleCloseEvent = () => this.handleEvent(StreamEvents.end, null)

    private handleErrorEvent = (ev: grpcWeb.RpcError) => this.handleEvent(StreamEvents.error, ev)

    private handleMessageEvent = (ev: any) => this.handleEvent(StreamEvents.data, this.options?.isObject ? ev?.toObject() : ev)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private handleEvent<K extends StreamEvents>(type: K, ev: StreamEventMap[K]) {
        switch (type) {
            case StreamEvents.end:
            case StreamEvents.error:
                console.log('%c[Stream] Stream closed error', 'color: orange; font-size: 14px;', ev)
                if (this.options?.retry)
                    // failed to connect or connection lost, try to reconnect
                    this.reconnect()
                break
            case StreamEvents.data:
                this.retries = 0
                this.backoff?.reset() // reset backoff
                break
            default:
        }
        this.dispatchEvent<K>(type, ev) // forward to all listeners
    }

    reconnect() {
        if (this.backoff === undefined) {
            // no backoff, we're done
            console.log('%c[Stream] Reconnect stream expired', 'color: orange; font-size: 14px;')
            return
        }
        const backoff = this.backoff.next()
        setTimeout(() => {
            console.log('%c[Stream] Reconnecting', 'color: green; font-size: 14px;')
            // retry connection after waiting out the backoff-interval
            this.dispatchEvent(
                StreamEvents.retry,
                new CustomEvent<RetryEventDetails>(StreamEvents.retry, {
                    detail: {
                        retries: ++this.retries,
                        backoff: backoff,
                    },
                })
            )
            this.connect()
        }, backoff)
    }
}
