import { useState } from "react";
import { Home, Compass, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PartnerServiceModal = ({ isVerified, onClose }) => {
  const [selectedType, setSelectedType] = useState(null);
  const navigate = useNavigate();

  const serviceTypes = [
    {
      id: "homestay",
      title: "Homestay",
      description: "Đăng phòng, căn hộ hoặc homestay cho khách du lịch",
      icon: Home,
    },
    {
      id: "tour",
      title: "Tour",
      description: "Cung cấp tour hướng dẫn hoặc trải nghiệm du lịch",
      icon: Compass,
    },
  ];

  const handleCardSelect = (serviceId) => {
    setSelectedType(serviceId);
  };

  const handleContinue = () => {
    if (selectedType) {
      onClose();
      navigate("/PartnerService/register", { state: { type: selectedType } });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e8ecf0]">
          <h2 className="text-2xl font-semibold text-[#1a2332]">
            Thêm dịch vụ mới
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#f4f6f8] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#5a6577]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-[#5a6577] mb-8 text-center">
            Chọn loại dịch vụ bạn muốn cung cấp
          </p>

          {/* Service Type Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {serviceTypes.map((service) => {
              const IconComponent = service.icon;
              const isSelected = selectedType === service.id;

              return (
                <div
                  key={service.id}
                  onClick={() => handleCardSelect(service.id)}
                  className={`
                    relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
                    ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-[#e8ecf0] hover:border-primary/40"
                    }
                  `}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                  )}

                  {/* Icon */}
                  <div
                    className={`
                    w-12 h-12 rounded-lg mb-4 flex items-center justify-center
                    ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-[#f4f6f8] text-[#5a6577]"
                    }
                  `}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>

                  {/* Content */}
                  <h3
                    className={`
                    text-lg font-semibold mb-2
                    ${isSelected ? "text-primary" : "text-[#1a2332]"}
                  `}
                  >
                    {service.title}
                  </h3>
                  <p className="text-[#5a6577] text-sm leading-relaxed">
                    {service.description}
                  </p>
                </div>
              );
            })}
          </div>

          {!isVerified && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              Vui lòng hoàn tất xác minh tài khoản trước khi đăng dịch vụ.
            </div>
          )}
          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-[#5a6577] bg-white border border-[#e8ecf0] rounded-xl hover:bg-[#f9fafb] transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleContinue}
              disabled={!selectedType || !isVerified}
              className={`
                px-6 py-2.5 rounded-xl font-medium transition-colors
                ${
                  selectedType && isVerified
                    ? "bg-primary hover:bg-primary-hover text-white"
                    : "bg-[#e8ecf0] text-[#8d95a3] cursor-not-allowed"
                }
              `}
            >
              Tiếp tục
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerServiceModal;
