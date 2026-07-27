export type User = {
  id: number;
  username: string;
  email: string;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type SignupPayload = {
  username: string;
  email: string;
  password: string;
};
