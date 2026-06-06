import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 border border-[#e8ecf0] max-w-md text-center">
            <p className="text-lg font-semibold text-[#1a2332] mb-2">
              Đã xảy ra lỗi
            </p>
            <p className="text-sm text-[#5a6577] mb-4">
              {this.state.error?.message || "Lỗi không xác định"}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-[#008fa0] text-white rounded-lg hover:bg-[#007a8a] text-sm"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
