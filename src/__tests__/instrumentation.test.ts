// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest"
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base"
import { ROOT_CONTEXT, trace } from "@opentelemetry/api"

describe("OTEL tracing", () => {
  let exporter: InMemorySpanExporter
  let provider: BasicTracerProvider

  afterEach(async () => {
    exporter.reset()
    await provider.shutdown()
  })

  it("records spans with attributes", () => {
    exporter = new InMemorySpanExporter()
    provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    })

    const tracer = provider.getTracer("test")
    const span = tracer.startSpan("test-span")
    span.setAttribute("http.method", "GET")
    span.setAttribute("http.route", "/api/events")
    span.end()

    const spans = exporter.getFinishedSpans()
    expect(spans).toHaveLength(1)
    expect(spans[0].name).toBe("test-span")
    expect(spans[0].attributes["http.method"]).toBe("GET")
    expect(spans[0].attributes["http.route"]).toBe("/api/events")
  })

  it("records nested spans as parent-child", () => {
    exporter = new InMemorySpanExporter()
    provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    })

    const tracer = provider.getTracer("test")

    const parent = tracer.startSpan("parent")
    const parentCtx = trace.setSpan(ROOT_CONTEXT, parent)
    const child = tracer.startSpan("child", {}, parentCtx)
    child.end()
    parent.end()

    const spans = exporter.getFinishedSpans()
    expect(spans).toHaveLength(2)
    const childSpan = spans.find((s) => s.name === "child")!
    const parentSpan = spans.find((s) => s.name === "parent")!
    // In sdk-trace-base v2, parent info is on parentSpanContext
    expect(childSpan.parentSpanContext?.spanId).toBe(
      parentSpan.spanContext().spanId
    )
    // Both spans share the same traceId
    expect(childSpan.spanContext().traceId).toBe(
      parentSpan.spanContext().traceId
    )
  })
})
