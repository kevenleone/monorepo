import bcrypt from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import { Arg, Mutation, Resolver } from 'type-graphql';
import { promisify } from 'util';

import { User } from '../../entity/User';
import { createBaseResolver } from '../../utils/createBaseResolver';
import { constants, logger } from '../../utils/globalMethods';
import Inputs, { CreateUserInput } from './Inputs';

const { JWT_SECRET = '' } = process.env;

const { USER_NOT_FOUND, USER_PASSWORD_INVALID } = constants;

const BaseResolver = createBaseResolver('User', User, Inputs);

@Resolver(User)
export class UserResolver extends BaseResolver {
  @Mutation(() => User, { name: 'createUser' })
  async createUser(
    @Arg('data', () => CreateUserInput) data: CreateUserInput,
  ): Promise<User | undefined> {
    const { email } = data;
    let user = await User.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(data.password, 12);
      user = await super.create({
        ...data,
        password: hashedPassword,
      });
    }
    return user;
  }

  @Mutation(() => String)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
  ): Promise<string | Error> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return new Error(USER_NOT_FOUND);
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if (!passwordsMatch) {
      return new Error(USER_PASSWORD_INVALID);
    }

    const userData = { ...user, password: '' };

    try {
      const token: any = await promisify(jsonwebtoken.sign)(
        userData,
        JWT_SECRET,
      );
      logger.info(`Token generated for ${email}`);
      return token;
    } catch (e) {
      return new Error(e.message);
    }
  }

  @Mutation(() => Boolean)
  async forgotPassword(@Arg('email') email: string): Promise<boolean> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return false;
    }

    return true;
  }
}
