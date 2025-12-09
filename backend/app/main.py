from fastapi import FastAPI

app = FastAPI(
    title="FanXI API",
    version="0.1.0",
    description="Backend for the FanXI football lineup prediction game.",
)


@app.get("/health")
def health_check():
    return {"status": "ok"}
