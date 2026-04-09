import { useEffect } from "react";

interface RouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickupLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  deliveryLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  orderId: number;
}

export function RouteModal({
  isOpen,
  onClose,
  pickupLocation,
  deliveryLocation,
  orderId,
}: RouteModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    // Generate Google Maps URL with directions
    const googleMapsUrl = `https://www.google.com/maps/dir/${pickupLocation.latitude},${pickupLocation.longitude}/${deliveryLocation.latitude},${deliveryLocation.longitude}`;

    // Open Google Maps in a new tab
    window.open(googleMapsUrl, "_blank");

    // Close the modal immediately
    onClose();
  }, [isOpen, pickupLocation, deliveryLocation, onClose]);

  // This component doesn't render anything - it just opens Google Maps
  return null;
}
