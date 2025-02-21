"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { RiFocus2Line } from "react-icons/ri";
import { fetchUserData } from "../CRUD";

const ProfileLink = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchUserData().then(data => setUserData(data));
  }, []);

  if (!userData) return null;

  return (
    <div>
                  <Link href="/user" className="w-12 h-12 absolute top-4 right-4">

            {userData.avatar ? (
                <Image
                    src={userData.avatar}
                    alt="User Avatar"
                    fill={true}
                    className="w-12 h-12 rounded-full object-cover"
                />
            ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    {userData.firstname && userData.lastname}
                </div>
            )}
        </Link>
        <div>
                    <Link href="/lsession" className="underline bold absolute top-4 right-20 text-5xl ">
                        <RiFocus2Line />
                    </Link>
                </div>
    </div>

  );
};

export default ProfileLink; 