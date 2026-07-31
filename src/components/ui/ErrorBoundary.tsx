"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> { state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; } componentDidCatch(_error: Error, _info: ErrorInfo) {} render() { if (this.state.failed) return this.props.fallback ?? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><strong>Une erreur est survenue.</strong><button className="ml-3 font-semibold underline" onClick={() => this.setState({ failed: false })}>Réessayer</button></div>; return this.props.children; } }
