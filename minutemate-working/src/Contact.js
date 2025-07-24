import React from "react";
import { PhoneCall } from "lucide-react"; // Optional: lucide-react icon

const ContactUs = () => {
  return (
    <section className="flex items-center justify-center h-[80vh]  from-white via-slate-100 to-slate-200 p-3">

      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-lg w-full text-center">
        <div className="flex flex-col items-center gap-3">
          <PhoneCall className="text-pink-600 w-10 h-10 animate-bounce" />
          <h2 className="text-3xl font-bold text-slate-800">Contact Us</h2>
        </div>

        <div className="mt-6 space-y-2 text-slate-700">
          <p>
            <span className="font-semibold">Email:</span>{" "}
            <a
              href="mailto:shisprerana20@gmail.com"
              className="text-blue-600 hover:underline"
            >
              shisprerana20@gmail.com
            </a>
          </p>
          <p>
            <span className="font-semibold">Customer Care:</span>{" "}
            <a href="tel:+911234567893" className="text-blue-600 hover:underline">
              +91-1234567893
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ContactUs;
